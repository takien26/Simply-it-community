import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { AssetStatus, AssetCondition } from '@prisma/client';

// GET /api/assets - List assets with filters & pagination
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status') as AssetStatus | null;
    const condition = searchParams.get('condition') as AssetCondition | null;
    const locationId = searchParams.get('locationId');
    const companyName = searchParams.get('companyName');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');

    // Build filter query
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { assetTag: { contains: search, mode: 'insensitive' } },
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (locationId) where.locationId = locationId;
    if (companyName) where.companyName = companyName;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true, icon: true } },
          vendor: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
          licenseAssignments: { where: { revokedAt: null }, include: { license: { select: { id: true, name: true, licenseType: true, expiryDate: true, status: true } } } },
        assignments: {
            where: { returnedAt: null },
            include: { user: { select: { id: true, fullName: true, email: true, department: true } } },
          },
          _count: { select: { maintenanceLogs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.asset.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: assets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('List assets error:', error);
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
  }
}

// POST /api/assets - Create new asset
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = await hasPermission(currentUser.userId, 'assets.create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Missing assets.create permission' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      categoryId,
      assetTag: customAssetTag,
      brand,
      model,
      serialNumber,
      status,
      condition,
      purchaseDate,
      purchasePrice,
      warrantyExpiry,
      companyName,
      vendorId,
      locationId,
      assignedUserId,
      contractNumber,
      invoiceNumber,
      specs,
      notes,
    } = body;

    if (!name || !categoryId) {
      return NextResponse.json({ error: 'Tên thiết bị và danh mục là bắt buộc' }, { status: 400 });
    }
    if (!purchaseDate) {
      return NextResponse.json({ error: 'Ngày mua hàng là bắt buộc' }, { status: 400 });
    }

    // Auto-generate asset tag if not provided
    let assetTag = customAssetTag?.trim();
    if (!assetTag) {
      const count = await prisma.asset.count();
      assetTag = `IT-AST-${String(count + 1).padStart(4, '0')}`;
    } else {
      // Check duplicate tag
      const existing = await prisma.asset.findUnique({ where: { assetTag } });
      if (existing) {
        return NextResponse.json({ error: `Mã tài sản '${assetTag}' đã tồn tại` }, { status: 400 });
      }
    }

    if (serialNumber) {
      const existingSerial = await prisma.asset.findUnique({ where: { serialNumber } });
      if (existingSerial) {
        return NextResponse.json({ error: `Số Serial '${serialNumber}' đã tồn tại` }, { status: 400 });
      }
    }

    const initialStatus = assignedUserId ? 'IN_USE' : ((status as AssetStatus) || 'AVAILABLE');

    let parsedPrice: number | null = null;
    if (purchasePrice !== undefined && purchasePrice !== null && purchasePrice !== '') {
      let rawStr = String(purchasePrice).trim();
      if (rawStr.includes('.') && !rawStr.includes(',')) {
        rawStr = rawStr.replace(/\./g, '');
      } else if (rawStr.includes(',')) {
        rawStr = rawStr.replace(/\./g, '').replace(',', '.');
      }
      const clean = rawStr.replace(/[^0-9.-]+/g, '');
      const num = parseFloat(clean);
      if (!isNaN(num)) parsedPrice = num;
    }

    let parsedPurchaseDate: Date | null = null;
    if (purchaseDate) {
      const d = new Date(purchaseDate);
      if (!isNaN(d.getTime())) parsedPurchaseDate = d;
    }

    let parsedWarrantyExpiry: Date | null = null;
    if (warrantyExpiry) {
      const d = new Date(warrantyExpiry);
      if (!isNaN(d.getTime())) parsedWarrantyExpiry = d;
    }

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name,
        categoryId,
        brand: brand || null,
        model: model || null,
        serialNumber: serialNumber || null,
        status: initialStatus,
        condition: (condition as AssetCondition) || 'NEW',
        purchaseDate: parsedPurchaseDate,
        purchasePrice: parsedPrice,
        purchaseCurrency: body.purchaseCurrency || 'VND',
        warrantyExpiry: parsedWarrantyExpiry,
        companyName: companyName || null,
        vendorId: vendorId || null,
        locationId: locationId || null,
        contractNumber: contractNumber || null,
        invoiceNumber: invoiceNumber || null,
        specs: (() => {
          const baseSpecs = specs !== undefined ? { ...(specs as any) } : {};
          if (body.exchangeRate !== undefined) {
            baseSpecs.exchangeRate = Number(body.exchangeRate) || 1;
          }
          return Object.keys(baseSpecs).length > 0 ? baseSpecs : undefined;
        })(),
        notes: notes || null,
      },
      include: {
        category: true,
        location: true,
        vendor: true,
      },
    });

    if (assignedUserId) {
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          userId: assignedUserId,
          assignedById: currentUser.userId,
          assignedAt: new Date(),
          notes: 'Gán khi khởi tạo thiết bị',
        },
      });
    }

    await createAuditLog({
      action: 'CREATE',
      entityType: 'Asset',
      entityId: asset.id,
      userId: currentUser.userId,
      changes: { assetTag: asset.assetTag, name: asset.name },
    });

    return NextResponse.json({ success: true, data: asset }, { status: 201 });
  } catch (error) {
    console.error('Create asset error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create asset failed' }, { status: 500 });
  }
}
