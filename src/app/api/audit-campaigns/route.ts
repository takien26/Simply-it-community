import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SETTING_KEY_CAMPAIGNS = 'audit_campaigns_list';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });

    let campaigns: any[] = [];
    if (setting?.value) {
      try {
        campaigns = JSON.parse(setting.value);
      } catch {}
    }

    return NextResponse.json({ success: true, data: campaigns });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải danh sách đợt kiểm kê' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      companyName,
      companyNames,
      locationId,
      categoryId,
      notes,
      targetDate,
      responsiblePerson,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tên đợt kiểm kê' }, { status: 400 });
    }

    // Build filter for matching assets
    const where: any = {};
    const effectiveCompanies = Array.isArray(companyNames) && companyNames.length > 0
      ? companyNames
      : Array.isArray(companyName)
      ? companyName
      : companyName && companyName !== 'ALL'
      ? [companyName]
      : [];

    if (effectiveCompanies.length > 0 && !effectiveCompanies.includes('ALL')) {
      where.companyName = { in: effectiveCompanies };
    }
    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId;
    }
    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = categoryId;
    }

    let matchedAssets = await prisma.asset.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        location: { select: { id: true, name: true } },
        assignments: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, fullName: true, department: true } } },
        },
      },
      orderBy: { assetTag: 'asc' },
    });

    // Fallback if no assets matched the strict filter
    if (matchedAssets.length === 0 && effectiveCompanies.length > 0) {
      matchedAssets = await prisma.asset.findMany({
        include: {
          category: { select: { id: true, name: true, icon: true } },
          location: { select: { id: true, name: true } },
          assignments: {
            where: { returnedAt: null },
            include: { user: { select: { id: true, fullName: true, department: true } } },
          },
        },
        orderBy: { assetTag: 'asc' },
        take: 300,
      });
    }

    const items = matchedAssets.map((asset) => {
      const activeAssign = asset.assignments?.[0];
      const comp = (asset as any).companyName || (asset.specs as any)?.companyName || 'Công ty Cổ phần Tập đoàn ABC';
      return {
        id: asset.id,
        assetTag: asset.assetTag,
        name: asset.name,
        brand: asset.brand || '',
        model: asset.model || '',
        serialNumber: asset.serialNumber || '',
        companyName: comp,
        categoryName: asset.category?.name || '',
        categoryIcon: asset.category?.icon || '💻',
        locationId: asset.locationId || '',
        locationName: asset.location?.name || 'Kho IT',
        systemUserId: activeAssign?.user?.id || '',
        systemUserName: activeAssign?.user?.fullName || 'Chưa cấp phát (Trong kho)',
        systemDepartment: activeAssign?.user?.department || '',
        systemCondition: asset.condition || 'GOOD',
        systemStatus: asset.status || 'AVAILABLE',
        // Audit verification state
        isAudited: false,
        auditStatus: 'PENDING',
        actualUserId: activeAssign?.user?.id || '',
        actualUserName: activeAssign?.user?.fullName || 'Chưa cấp phát (Trong kho)',
        actualLocationId: asset.locationId || '',
        actualLocationName: asset.location?.name || 'Kho IT',
        actualCondition: asset.condition || 'GOOD',
        actualNotes: '',
        actualPhotoUrl: null,
        auditedAt: null,
        auditedBy: null,
      };
    });

    const newCampaign = {
      id: 'AUDIT-' + Date.now(),
      title: title.trim(),
      companyName: effectiveCompanies.length > 0 ? (effectiveCompanies.length === 1 ? effectiveCompanies[0] : effectiveCompanies.join(', ')) : 'ALL',
      selectedCompanies: effectiveCompanies.length > 0 ? effectiveCompanies : ['ALL'],
      locationId: locationId || 'ALL',
      categoryId: categoryId || 'ALL',
      notes: notes || '',
      targetDate: targetDate || null,
      responsiblePerson: responsiblePerson || user.email,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      createdBy: user.email,
      totalAssets: items.length,
      auditedCount: 0,
      items,
    };

    // Load existing campaigns
    const setting = await prisma.systemSetting.findUnique({
      where: { key: SETTING_KEY_CAMPAIGNS },
    });
    let list: any[] = [];
    if (setting?.value) {
      try {
        list = JSON.parse(setting.value);
      } catch {}
    }

    list.unshift(newCampaign);

    await prisma.systemSetting.upsert({
      where: { key: SETTING_KEY_CAMPAIGNS },
      update: { value: JSON.stringify(list), updatedAt: new Date() },
      create: {
        key: SETTING_KEY_CAMPAIGNS,
        value: JSON.stringify(list),
        type: 'JSON',
        group: 'audit',
        label: 'Danh Sách Đợt Kiểm Kê',
      },
    });

    return NextResponse.json({ success: true, data: newCampaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo đợt kiểm kê' }, { status: 500 });
  }
}
