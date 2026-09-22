import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { moveToTrash } from '@/lib/trash';
import { normalizeCompanyName } from '@/lib/normalize';

// GET /api/licenses/[id]
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
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        vendor: true,
        parentLicense: { select: { id: true, name: true } },
        batches: {
          include: {
            vendor: true,
            assignments: {
              where: { revokedAt: null },
              include: {
                user: { select: { id: true, fullName: true, email: true, department: true, companyName: true, isActive: true } },
                asset: { select: { id: true, assetTag: true, name: true, companyName: true } },
              },
            },
          },
          orderBy: { purchaseDate: 'asc' },
        },
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            attachments: true,
            invoiceNumber: true,
            contractNumber: true,
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true, companyName: true, isActive: true } },
            asset: { select: { id: true, assetTag: true, name: true, companyName: true } },
            assignedBy: { select: { fullName: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: license });
  } catch (error) {
    console.error('Get license error:', error);
    return NextResponse.json({ error: 'Failed to fetch license' }, { status: 500 });
  }
}

// PUT /api/licenses/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'licenses.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    let usedSeats = existing.usedSeats;
    if (Array.isArray(body.pairs)) {
      const validPairs = body.pairs.filter((p: any) => p.userId || p.assetId);
      // Delete old active assignments to replace with new assignment list
      await prisma.licenseAssignment.deleteMany({
        where: { licenseId: id },
      });
      // Create updated assignments
      for (const pair of validPairs) {
        await prisma.licenseAssignment.create({
          data: {
            licenseId: id,
            userId: pair.userId || null,
            assetId: pair.assetId || null,
            assignedById: currentUser.userId,
            assignedAt: pair.assignedAt ? new Date(pair.assignedAt) : new Date(),
            notes: pair.notes || 'Gán phân bổ sử dụng',
          },
        });
      }
      usedSeats = validPairs.length;
    }

    let finalSpecs = body.specs !== undefined ? body.specs : (existing as any).specs;
    if (body.batchName !== undefined) {
      finalSpecs = { ...(finalSpecs && typeof finalSpecs === 'object' ? finalSpecs : {}), batchName: body.batchName };
    }

    if (body.purchaseDate) {
      const d = new Date(body.purchaseDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Ngày mua (purchaseDate) không hợp lệ' }, { status: 400 });
      }
    }

    if (body.expiryDate) {
      const d = new Date(body.expiryDate);
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Ngày hết hạn (expiryDate) không hợp lệ' }, { status: 400 });
      }
    }

    const updated = await prisma.license.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : existing.name,
        licenseKey: body.licenseKey !== undefined ? (body.licenseKey || null) : existing.licenseKey,
        licenseType: body.licenseType ?? existing.licenseType,
        totalSeats: body.totalSeats !== undefined && body.totalSeats !== '' ? Number(body.totalSeats) : existing.totalSeats,
        usedSeats: usedSeats,
        purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        purchasePrice: body.purchasePrice !== undefined && body.purchasePrice !== '' && !isNaN(Number(body.purchasePrice)) ? Number(body.purchasePrice) : null,
        purchaseCurrency: body.purchaseCurrency !== undefined ? (body.purchaseCurrency || 'VND') : existing.purchaseCurrency,
        vendorId: body.vendorId !== undefined ? (body.vendorId || null) : existing.vendorId,
        companyName: body.companyName !== undefined ? (body.companyName ? normalizeCompanyName(body.companyName) : null) : (existing as any).companyName,
        contractNumber: body.contractNumber !== undefined ? (body.contractNumber || null) : existing.contractNumber,
        invoiceNumber: body.invoiceNumber !== undefined ? (body.invoiceNumber || null) : existing.invoiceNumber,
        contractUrl: body.contractUrl !== undefined ? (body.contractUrl || null) : existing.contractUrl,
        parentLicenseId: body.parentLicenseId !== undefined ? (body.parentLicenseId || null) : (existing as any).parentLicenseId,
        status: body.status ?? existing.status,
        specs: finalSpecs,
        notes: body.notes !== undefined ? (body.notes || null) : existing.notes,
      },
      include: {
        vendor: true,
        parentLicense: { select: { id: true, name: true } },
        batches: {
          include: {
            vendor: true,
            assignments: {
              where: { revokedAt: null },
              include: {
                user: { select: { id: true, fullName: true, email: true, department: true, companyName: true } },
                asset: { select: { id: true, assetTag: true, name: true, companyName: true } },
              },
            },
          },
          orderBy: { purchaseDate: 'asc' },
        },
        documents: {
          select: {
            id: true,
            title: true,
            type: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            fileType: true,
            attachments: true,
            invoiceNumber: true,
            contractNumber: true,
          },
        },
        assignments: {
          where: { revokedAt: null },
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true, companyName: true } },
            asset: { select: { id: true, assetTag: true, name: true, companyName: true } },
          },
        },
      },
    });

    await createAuditLog({
      action: 'UPDATE',
      entityType: 'License',
      entityId: id,
      userId: currentUser.userId,
      changes: { before: existing, after: updated },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update license error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 500 });
  }
}

// DELETE /api/licenses/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(currentUser.userId, 'licenses.delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    // Lưu snapshot license vào Thùng rác trước khi xóa
    const trashResult = await moveToTrash({
      entityType: 'LICENSE',
      entityId: id,
      entityName: existing.name,
      entityCode: existing.licenseKey ? `KEY: ${existing.licenseKey.slice(0, 8)}...` : null,
      dataSnapshot: existing,
      deletedById: currentUser.userId,
      deletedByName: currentUser.fullName || currentUser.email,
    }).catch((err) => {
      console.error('Failed to snapshot license to trash:', err);
      return null;
    });

    await prisma.$transaction(async (tx) => {
      // 1. Unlink documents referencing this license
      await tx.document.updateMany({
        where: { licenseId: id },
        data: { licenseId: null },
      });

      // 2. Delete all assignments for this license
      await tx.licenseAssignment.deleteMany({
        where: { licenseId: id },
      });

      // 3. Delete the license
      await tx.license.delete({ where: { id } });
    });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'License',
      entityId: id,
      userId: currentUser.userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Đã chuyển bản quyền vào Thùng rác',
      trashItemId: trashResult?.trashItem?.id || null,
      licenseName: existing.name,
    });
  } catch (error) {
    console.error('Delete license error:', error);
    return NextResponse.json({ error: 'Failed to delete license' }, { status: 500 });
  }
}
