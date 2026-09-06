import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { LicenseType, LicenseStatus } from '@prisma/client';

// GET /api/licenses
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const status = searchParams.get('status') as LicenseStatus | null;
    const licenseType = searchParams.get('licenseType') as LicenseType | null;
    const vendorId = searchParams.get('vendorId');
    const companyName = searchParams.get('companyName');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { licenseKey: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) where.status = status;
    if (licenseType) where.licenseType = licenseType;
    if (vendorId) where.vendorId = vendorId;
    if (companyName) where.companyName = companyName;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          assignments: {
            where: { revokedAt: null },
            include: {
              user: { select: { id: true, fullName: true, email: true, department: true } },
              asset: { select: { id: true, assetTag: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.license.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: licenses,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('List licenses error:', error);
    return NextResponse.json({ error: 'Failed to list licenses' }, { status: 500 });
  }
}

// POST /api/licenses
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = await hasPermission(currentUser.userId, 'licenses.create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      licenseKey,
      licenseType,
      totalSeats,
      purchaseDate,
      expiryDate,
      purchasePrice,
      vendorId,
      companyName,
      contractNumber,
      invoiceNumber,
      pairs,
      assignedUserIds,
      assignedAssetIds,
      notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên phần mềm là bắt buộc' }, { status: 400 });
    }

    // Support unified paired assignments (1 Pair = 1 User + 1 Asset = 1 Seat)
    let targetPairs: Array<{ userId?: string | null; assetId?: string | null }> = [];
    if (Array.isArray(pairs) && pairs.length > 0) {
      targetPairs = pairs.filter((p: any) => p.userId || p.assetId);
    } else {
      const targetUserIds: string[] = Array.isArray(assignedUserIds) ? assignedUserIds : [];
      const targetAssetIds: string[] = Array.isArray(assignedAssetIds) ? assignedAssetIds : [];
      for (const uid of targetUserIds) targetPairs.push({ userId: uid, assetId: null });
      for (const aid of targetAssetIds) targetPairs.push({ userId: null, assetId: aid });
    }

    const initialSeatsUsed = targetPairs.length;
    const totalSeatsNum = totalSeats ? Number(totalSeats) : Math.max(1, initialSeatsUsed);

    if (initialSeatsUsed > totalSeatsNum) {
      return NextResponse.json(
        { error: `Số lượng gán ban đầu (${initialSeatsUsed}) vượt quá tổng số seats (${totalSeatsNum})` },
        { status: 400 }
      );
    }

    const license = await prisma.license.create({
      data: {
        name,
        licenseKey: licenseKey || null,
        licenseType: (licenseType as LicenseType) || 'PERPETUAL',
        totalSeats: totalSeatsNum,
        usedSeats: initialSeatsUsed,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        purchasePrice: purchasePrice ? Number(purchasePrice) : null,
        purchaseCurrency: body.purchaseCurrency || 'VND',
        vendorId: vendorId || null,
        companyName: companyName || null,
        contractNumber: contractNumber || null,
        invoiceNumber: invoiceNumber || null,
        status: 'ACTIVE',
        specs: body.specs || null,
        notes: notes || null,
      },
    });

    // Create assignments immediately if provided
    for (const pair of targetPairs) {
      await prisma.licenseAssignment.create({
        data: {
          licenseId: license.id,
          userId: pair.userId || null,
          assetId: pair.assetId || null,
          assignedById: currentUser.userId,
          assignedAt: new Date(),
          notes: notes || 'Gán khi khởi tạo license',
        },
      });
    }

    await createAuditLog({
      action: 'CREATE',
      entityType: 'License',
      entityId: license.id,
      userId: currentUser.userId,
      changes: {
        name: license.name,
        totalSeats: license.totalSeats,
        initialAssignedPairs: initialSeatsUsed,
      },
    });

    return NextResponse.json({ success: true, data: license }, { status: 201 });
  } catch (error) {
    console.error('Create license error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create failed' }, { status: 500 });
  }
}
