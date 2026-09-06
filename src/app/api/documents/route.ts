import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { DocumentType } from '@prisma/client';

// GET /api/documents
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const type = searchParams.get('type') as DocumentType | null;
    const companyName = searchParams.get('companyName') || '';
    const vendorId = searchParams.get('vendorId') || '';
    const projectName = searchParams.get('projectName') || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { projectCode: { contains: search, mode: 'insensitive' } },
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { vendorName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { fileName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (type && type !== ('ALL' as any)) {
      where.type = type;
    }

    if (companyName && companyName !== 'ALL') {
      where.companyName = companyName;
    }

    if (vendorId && vendorId !== 'ALL') {
      where.vendorId = vendorId;
    }

    if (projectName && projectName !== 'ALL') {
      where.projectName = projectName;
    }

    if (startDate || endDate) {
      where.documentDate = {};
      if (startDate) where.documentDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.documentDate.lte = end;
      }
    }

    const [documents, totalCount, allDocsForStats] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          asset: { select: { id: true, assetTag: true, name: true, serialNumber: true } },
          service: { select: { id: true, serviceCode: true, name: true, serviceType: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ documentDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.document.count({ where }),
      prisma.document.findMany({
        select: {
          type: true,
          amount: true,
          projectName: true,
        },
      }),
    ]);

    const stats = {
      totalDocs: allDocsForStats.length,
      totalInvoices: allDocsForStats.filter((d) => d.type === 'INVOICE').length,
      totalContracts: allDocsForStats.filter((d) => d.type === 'CONTRACT').length,
      totalHandovers: allDocsForStats.filter((d) => d.type === 'HANDOVER').length,
      totalWarranties: allDocsForStats.filter((d) => d.type === 'WARRANTY').length,
      totalQuotations: allDocsForStats.filter((d) => d.type === 'QUOTATION').length,
      totalProjects: new Set(allDocsForStats.map((d) => d.projectName).filter(Boolean)).size,
      totalAmount: allDocsForStats.reduce((sum, d) => sum + (d.amount ? Number(d.amount) : 0), 0),
    };

    return NextResponse.json({
      success: true,
      data: documents,
      total: totalCount,
      stats,
    });
  } catch (error) {
    console.error('Fetch documents error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch documents' },
      { status: 500 }
    );
  }
}

// POST /api/documents
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      type,
      projectName,
      projectCode,
      contractNumber,
      invoiceNumber,
      companyName,
      vendorId,
      vendorName,
      assetId,
      licenseId,
      serviceId,
      documentDate,
      amount,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      attachments,
      notes,
    } = body;

    const fileList = Array.isArray(attachments) && attachments.length > 0
      ? attachments
      : (fileUrl ? [{ url: fileUrl, name: fileName || 'document.pdf', size: fileSize || 0, type: fileType || '' }] : []);

    const primaryFile = fileList[0] || {};
    const finalFileUrl = fileUrl || primaryFile.url;
    const finalFileName = fileName || primaryFile.name || 'document.pdf';
    const finalFileSize = fileSize || primaryFile.size || null;
    const finalFileType = fileType || primaryFile.type || null;

    if (!title || !finalFileUrl) {
      return NextResponse.json(
        { error: 'Tiêu đề tài liệu và ít nhất 1 file đính kèm là bắt buộc' },
        { status: 400 }
      );
    }

    let finalVendorName = vendorName;
    if (vendorId && !finalVendorName) {
      const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
      if (v) finalVendorName = v.name;
    }

    const doc = await prisma.document.create({
      data: {
        title,
        type: (type as DocumentType) || 'INVOICE',
        projectName: projectName ? projectName.trim() : null,
        projectCode: projectCode ? projectCode.trim() : null,
        contractNumber: contractNumber || null,
        invoiceNumber: invoiceNumber || null,
        companyName: companyName || null,
        vendorId: vendorId || null,
        vendorName: finalVendorName || null,
        assetId: assetId || null,
        licenseId: licenseId || null,
        serviceId: serviceId || null,
        documentDate: documentDate ? new Date(documentDate) : null,
        amount: amount !== undefined && amount !== '' && !isNaN(Number(amount)) ? Number(amount) : null,
        amountCurrency: 'VND',
        fileUrl: finalFileUrl,
        fileName: finalFileName,
        fileSize: finalFileSize,
        fileType: finalFileType,
        attachments: fileList,
        notes: notes || null,
        createdById: currentUser.userId,
      },
      include: {
        vendor: { select: { id: true, name: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
        license: { select: { id: true, name: true, licenseKey: true, licenseType: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, data: doc }, { status: 201 });
  } catch (error) {
    console.error('Create document error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Tạo tài liệu thất bại' },
      { status: 500 }
    );
  }
}
