import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { AssetStatus, AssetCondition } from '@prisma/client';
import { normalizeAssetTag, normalizeCompanyName } from '@/lib/normalize';

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
    const source = searchParams.get('source');
    const warranty = searchParams.get('warranty');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const rawPageSize = parseInt(searchParams.get('pageSize') || '50', 10) || 50;
    const pageSize = Math.max(1, Math.min(10000, rawPageSize));

    // Build filter query
    const where: Record<string, unknown> = {};
    const andConditions: any[] = [];

    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { assetTag: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          { companyName: { contains: search, mode: 'insensitive' } },
          { contractNumber: { contains: search, mode: 'insensitive' } },
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (source === 'AUTO_SCAN') {
      andConditions.push({
        OR: [
          { notes: { contains: 'Agent', mode: 'insensitive' } },
          { notes: { contains: 'PowerShell', mode: 'insensitive' } },
          { notes: { contains: 'Auto-Scan', mode: 'insensitive' } },
        ],
      });
    } else if (source === 'MANUAL') {
      andConditions.push({
        NOT: [
          { notes: { contains: 'Agent', mode: 'insensitive' } },
          { notes: { contains: 'PowerShell', mode: 'insensitive' } },
          { notes: { contains: 'Auto-Scan', mode: 'insensitive' } },
        ],
      });
    }

    if (warranty === 'VALID') {
      where.warrantyExpiry = { gte: new Date() };
    } else if (warranty === 'EXPIRING') {
      const now = new Date();
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      where.warrantyExpiry = { gte: now, lte: in30Days };
    } else if (warranty === 'EXPIRED') {
      andConditions.push({
        OR: [
          { warrantyExpiry: { lt: new Date() } },
          { warrantyExpiry: null },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (condition) where.condition = condition;
    if (locationId) where.locationId = locationId;
    if (companyName) where.companyName = { equals: companyName, mode: 'insensitive' };

    const [assets, total, countsByStatus, deprecAssets, categoryCounts] = await Promise.all([
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
      prisma.asset.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
      prisma.asset.findMany({
        where,
        select: {
          purchasePrice: true,
          purchaseCurrency: true,
          purchaseDate: true,
          condition: true,
          specs: true,
          category: { select: { name: true } },
        },
      }),
      prisma.asset.groupBy({
        by: ['categoryId'],
        _count: { _all: true },
      }),
    ]);

    // Financial KPI Metrics (Linear Depreciation)
    const now = new Date();
    let totalOriginalPrice = 0;
    let totalDepreciation = 0;

    deprecAssets.forEach((asset) => {
      const price = Number(asset.purchasePrice) || 0;
      totalOriginalPrice += price;
      if (price > 0) {
        const catName = (asset.category?.name || '').toLowerCase();
        const customMonths = Number((asset.specs as any)?.depreciationMonths);
        const usefulLifeMonths =
          customMonths > 0
            ? customMonths
            : catName.includes('server') || catName.includes('máy chủ') || catName.includes('switch') || catName.includes('router') || catName.includes('mạng')
              ? 60
              : 36;

        if (asset.purchaseDate) {
          const pDate = new Date(asset.purchaseDate);
          if (!isNaN(pDate.getTime())) {
            const diffMonths = Math.max(0, (now.getFullYear() - pDate.getFullYear()) * 12 + (now.getMonth() - pDate.getMonth()));
            const ratio = usefulLifeMonths > 0 ? Math.min(1, diffMonths / usefulLifeMonths) : 1;
            totalDepreciation += price * ratio;
          } else {
            totalDepreciation += price * (asset.condition === 'NEW' ? 0 : 0.25);
          }
        } else {
          totalDepreciation += price * (asset.condition === 'NEW' ? 0 : 0.25);
        }
      }
    });

    const pendingCount = countsByStatus.find((c) => c.status === 'PENDING')?._count._all || 0;
    const availableCount = countsByStatus.find((c) => c.status === 'AVAILABLE')?._count._all || 0;
    const inUseCount = countsByStatus.find((c) => c.status === 'IN_USE')?._count._all || 0;
    const maintenanceCount = countsByStatus.find((c) => c.status === 'MAINTENANCE')?._count._all || 0;
    const remainingValue = Math.max(0, totalOriginalPrice - totalDepreciation);
    const depreciationPercent = totalOriginalPrice > 0 ? Math.round((totalDepreciation / totalOriginalPrice) * 100) : 0;

    const categoryCountsMap: Record<string, number> = {};
    categoryCounts.forEach((c) => {
      categoryCountsMap[c.categoryId] = c._count._all;
    });

    return NextResponse.json({
      success: true,
      data: assets,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      summary: {
        totalCount: total,
        pendingCount,
        availableCount,
        inUseCount,
        maintenanceCount,
        totalOriginalPrice,
        totalDepreciation,
        remainingValue,
        depreciationPercent,
        categoryCounts: categoryCountsMap,
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

    let finalCategoryId = categoryId;
    if (!finalCategoryId) {
      const defaultCategory = await prisma.assetCategory.findFirst({ orderBy: { createdAt: 'asc' } });
      finalCategoryId = defaultCategory?.id || null;
    }

    if (!name || !finalCategoryId) {
      return NextResponse.json({ error: 'Tên thiết bị và danh mục là bắt buộc' }, { status: 400 });
    }

    // Auto-generate asset tag if not provided
    let assetTag = customAssetTag ? normalizeAssetTag(customAssetTag) : undefined;
    if (!assetTag) {
      const latestAsset = await prisma.asset.findFirst({
        where: { assetTag: { startsWith: 'IT-AST-' } },
        orderBy: { assetTag: 'desc' },
        select: { assetTag: true },
      });
      let nextSeq = 1;
      if (latestAsset?.assetTag) {
        const match = latestAsset.assetTag.match(/^IT-AST-(\d+)/);
        if (match && match[1]) {
          const parsed = parseInt(match[1], 10);
          if (!isNaN(parsed)) nextSeq = parsed + 1;
        }
      }
      assetTag = `IT-AST-${String(nextSeq).padStart(4, '0')}`;
      let exists = await prisma.asset.findUnique({ where: { assetTag } });
      while (exists) {
        nextSeq++;
        assetTag = `IT-AST-${String(nextSeq).padStart(4, '0')}`;
        exists = await prisma.asset.findUnique({ where: { assetTag } });
      }
    } else {
      // Check duplicate tag
      const existing = await prisma.asset.findUnique({ where: { assetTag } });
      if (existing) {
        return NextResponse.json({ error: `Mã tài sản '${assetTag}' đã tồn tại` }, { status: 400 });
      }
    }

    const cleanSerial = serialNumber ? serialNumber.trim().toUpperCase() : null;
    if (cleanSerial) {
      const existingSerial = await prisma.asset.findUnique({ where: { serialNumber: cleanSerial } });
      if (existingSerial) {
        return NextResponse.json({ error: `Số Serial '${cleanSerial}' đã tồn tại` }, { status: 400 });
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

    let parsedPurchaseDate: Date = new Date();
    if (purchaseDate) {
      const d = new Date(purchaseDate);
      if (isNaN(d.getTime()) || d.getFullYear() < 1980 || d.getFullYear() > 2100) {
        return NextResponse.json({ error: 'Ngày mua (purchaseDate) không hợp lệ' }, { status: 400 });
      }
      parsedPurchaseDate = d;
    }

    let parsedWarrantyExpiry: Date | null = null;
    if (warrantyExpiry) {
      const d = new Date(warrantyExpiry);
      if (isNaN(d.getTime()) || d.getFullYear() < 1980 || d.getFullYear() > 2100) {
        return NextResponse.json({ error: 'Ngày hết hạn bảo hành (warrantyExpiry) không hợp lệ' }, { status: 400 });
      }
      parsedWarrantyExpiry = d;
    }

    const asset = await prisma.asset.create({
      data: {
        assetTag,
        name,
        categoryId: finalCategoryId,
        brand: brand || null,
        model: model || null,
        serialNumber: cleanSerial,
        status: initialStatus,
        condition: (condition as AssetCondition) || 'NEW',
        purchaseDate: parsedPurchaseDate,
        purchasePrice: parsedPrice,
        purchaseCurrency: body.purchaseCurrency || 'VND',
        warrantyExpiry: parsedWarrantyExpiry,
        companyName: companyName ? normalizeCompanyName(companyName) : null,
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
