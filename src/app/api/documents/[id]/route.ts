import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { moveToTrash } from '@/lib/trash';
import { DocumentType } from '@prisma/client';

// GET /api/documents/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        vendor: true,
        asset: true,
        license: true,
        service: true,
        createdBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    console.error('Get document error:', error);
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 });
  }
}

// PUT /api/documents/[id] - Update document
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 });
    }

    let finalDocDate: Date | null | undefined = undefined;
    if (body.documentDate !== undefined) {
      if (body.documentDate === null || body.documentDate === '') {
        finalDocDate = null;
      } else {
        const d = new Date(body.documentDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json({ error: 'Ngày tài liệu (documentDate) không hợp lệ' }, { status: 400 });
        }
        finalDocDate = d;
      }
    }

    let finalVendorName = body.vendorName !== undefined ? body.vendorName : existing.vendorName;
    if (body.vendorId && body.vendorId !== existing.vendorId) {
      const v = await prisma.vendor.findUnique({ where: { id: body.vendorId } });
      if (v) finalVendorName = v.name;
    }

    const fileList = Array.isArray(body.attachments)
      ? body.attachments
      : (body.fileUrl ? [{ url: body.fileUrl, name: body.fileName || 'document.pdf', size: body.fileSize || 0, type: body.fileType || '' }] : existing.attachments);

    const primaryFile = (Array.isArray(fileList) && fileList.length > 0) ? fileList[0] : null;

    const updated = await prisma.document.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : existing.title,
        type: body.type !== undefined ? (body.type as DocumentType) : existing.type,
        projectName: body.projectName !== undefined ? (body.projectName ? body.projectName.trim() : null) : existing.projectName,
        projectCode: body.projectCode !== undefined ? (body.projectCode ? body.projectCode.trim() : null) : existing.projectCode,
        contractNumber: body.contractNumber !== undefined ? (body.contractNumber || null) : existing.contractNumber,
        invoiceNumber: body.invoiceNumber !== undefined ? (body.invoiceNumber || null) : existing.invoiceNumber,
        companyName: body.companyName !== undefined ? (body.companyName || null) : existing.companyName,
        vendorId: body.vendorId !== undefined ? (body.vendorId || null) : existing.vendorId,
        vendorName: finalVendorName,
        assetId: body.assetId !== undefined ? (body.assetId || null) : existing.assetId,
        licenseId: body.licenseId !== undefined ? (body.licenseId || null) : existing.licenseId,
        serviceId: body.serviceId !== undefined ? (body.serviceId || null) : existing.serviceId,
        ...(finalDocDate !== undefined ? { documentDate: finalDocDate } : {}),
        amount: body.amount !== undefined && body.amount !== '' && !isNaN(Number(body.amount)) ? Number(body.amount) : null,
        fileUrl: body.fileUrl !== undefined ? body.fileUrl : (primaryFile?.url || existing.fileUrl),
        fileName: body.fileName !== undefined ? body.fileName : (primaryFile?.name || existing.fileName),
        fileSize: body.fileSize !== undefined ? (body.fileSize ? Number(body.fileSize) : null) : (primaryFile?.size || existing.fileSize),
        fileType: body.fileType !== undefined ? body.fileType : (primaryFile?.type || existing.fileType),
        attachments: fileList || existing.attachments,
        notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
        license: { select: { id: true, name: true, licenseKey: true, licenseType: true } },
        service: { select: { id: true, serviceCode: true, name: true, serviceType: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update document error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cập nhật thất bại' }, { status: 500 });
  }
}

// DELETE /api/documents/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.document.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy tài liệu' }, { status: 404 });
    }

    // Lưu snapshot document vào Thùng rác trước khi xóa
    const trashResult = await moveToTrash({
      entityType: 'DOCUMENT',
      entityId: id,
      entityName: existing.title,
      entityCode: existing.contractNumber || existing.invoiceNumber || existing.fileName || null,
      dataSnapshot: existing,
      deletedById: currentUser.userId,
      deletedByName: currentUser.fullName || currentUser.email,
    }).catch((err) => {
      console.error('Failed to snapshot document to trash:', err);
      return null;
    });

    await prisma.document.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'Document',
      entityId: id,
      userId: currentUser.userId,
      changes: { deleted: existing.title },
    });

    return NextResponse.json({
      success: true,
      message: trashResult
        ? `Đã chuyển tài liệu vào Thùng rác (Lưu trữ ${trashResult.retentionDays} ngày)`
        : 'Đã xóa tài liệu thành công',
      inTrash: !!trashResult,
      trashItemId: trashResult?.trashItem?.id || null,
    });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Xóa tài liệu thất bại' }, { status: 500 });
  }
}
