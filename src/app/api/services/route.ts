import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const serviceType = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const vendorId = searchParams.get('vendorId') || '';
    const companyName = searchParams.get('companyName') || '';
    const locationId = searchParams.get('locationId') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.max(1, parseInt(searchParams.get('pageSize') || '50'));

    const where: any = {};

    if (search) {
      where.OR = [
        { serviceCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { contractNumber: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { contactSupport: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (serviceType && serviceType !== 'ALL') {
      where.serviceType = serviceType;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (vendorId && vendorId !== 'ALL') {
      where.vendorId = vendorId;
    }

    if (companyName && companyName !== 'ALL') {
      where.companyName = companyName;
    }

    if (locationId && locationId !== 'ALL') {
      where.locationId = locationId;
    }

    const [total, services, allForStats] = await Promise.all([
      prisma.iTService.count({ where }),
      prisma.iTService.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true, phone: true, email: true } },
          location: { select: { id: true, name: true, building: true, floor: true } },
          documents: { select: { id: true, title: true, type: true, fileUrl: true, fileName: true, amount: true } },
          createdBy: { select: { id: true, fullName: true, email: true } },
        },
        orderBy: [{ status: 'asc' }, { renewalDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.iTService.findMany({
        select: {
          id: true,
          status: true,
          cost: true,
          billingCycle: true,
          renewalDate: true,
        },
      }),
    ]);

    // Calculate Summary Stats
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let activeCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let totalMonthlyCost = 0;
    let totalYearlyCost = 0;

    for (const item of allForStats) {
      if (item.status === 'ACTIVE') {
        activeCount++;
        const costNum = Number(item.cost) || 0;
        let monthly = 0;
        switch (item.billingCycle) {
          case 'MONTHLY':
            monthly = costNum;
            break;
          case 'QUARTERLY':
            monthly = costNum / 3;
            break;
          case 'SEMI_ANNUAL':
            monthly = costNum / 6;
            break;
          case 'ANNUAL':
            monthly = costNum / 12;
            break;
          case 'BIENNIAL':
            monthly = costNum / 24;
            break;
          case 'TRIENNIAL':
            monthly = costNum / 36;
            break;
          default:
            monthly = costNum;
            break;
        }
        totalMonthlyCost += monthly;
        totalYearlyCost += monthly * 12;

        if (item.renewalDate) {
          const rDate = new Date(item.renewalDate);
          if (rDate <= thirtyDaysLater && rDate >= now) {
            expiringSoonCount++;
          } else if (rDate < now) {
            expiredCount++;
          }
        }
      } else if (item.status === 'EXPIRED') {
        expiredCount++;
      }
    }

    return NextResponse.json({
      success: true,
      data: services,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
      stats: {
        total: allForStats.length,
        active: activeCount,
        expiringSoon: expiringSoonCount,
        expired: expiredCount,
        totalMonthlyCost: Math.round(totalMonthlyCost),
        totalYearlyCost: Math.round(totalYearlyCost),
      },
    });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tải danh sách dịch vụ' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const canCreate = await hasPermission(user.userId, 'services.create');
    if (!canCreate && user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Bạn không có quyền thêm dịch vụ' }, { status: 403 });
    }

    const body = await req.json();
    let {
      serviceCode,
      name,
      serviceType,
      status,
      billingCycle,
      cost,
      currency,
      startDate,
      renewalDate,
      expiryDate,
      accountNumber,
      contractNumber,
      invoiceNumber,
      vendorId,
      companyName,
      locationId,
      contactSupport,
      specs,
      contractUrl,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên dịch vụ không được để trống' }, { status: 400 });
    }

    // Auto-generate serviceCode if blank
    if (!serviceCode || !serviceCode.trim()) {
      const year = new Date().getFullYear();
      const count = await prisma.iTService.count();
      const prefix = serviceType === 'INTERNET' ? 'NET' : serviceType === 'CLOUD_HOSTING' ? 'CLOUD' : serviceType === 'DOMAIN_SSL' ? 'DOM' : 'SVC';
      serviceCode = `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
    }

    // Check unique code
    const existing = await prisma.iTService.findUnique({ where: { serviceCode: serviceCode.trim() } });
    if (existing) {
      return NextResponse.json({ error: `Mã dịch vụ "${serviceCode}" đã tồn tại trên hệ thống` }, { status: 400 });
    }

    const service = await prisma.iTService.create({
      data: {
        serviceCode: serviceCode.trim(),
        name: name.trim(),
        serviceType: serviceType || 'INTERNET',
        status: status || 'ACTIVE',
        billingCycle: billingCycle || 'MONTHLY',
        cost: cost ? parseFloat(String(cost).replace(/[^0-9.-]+/g, '')) : null,
        currency: currency || 'VND',
        startDate: startDate ? new Date(startDate) : null,
        renewalDate: renewalDate ? new Date(renewalDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        accountNumber: accountNumber ? accountNumber.trim() : null,
        contractNumber: contractNumber ? contractNumber.trim() : null,
        invoiceNumber: invoiceNumber ? invoiceNumber.trim() : null,
        vendorId: vendorId || null,
        companyName: companyName ? companyName.trim() : null,
        locationId: locationId || null,
        contactSupport: contactSupport ? contactSupport.trim() : null,
        specs: specs || null,
        contractUrl: contractUrl || null,
        notes: notes ? notes.trim() : null,
        createdById: user.userId,
      },
      include: {
        vendor: true,
        location: true,
        documents: true,
      },
    });

    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo dịch vụ' }, { status: 500 });
  }
}
