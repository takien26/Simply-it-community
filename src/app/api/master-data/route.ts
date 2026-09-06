import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

let masterDataCache: { timestamp: number; data: any } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60s cache

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (masterDataCache && Date.now() - masterDataCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(masterDataCache.data);
    }

    const [
      categories,
      locations,
      vendors,
      users,
      services,
      supportTeams,
      supportQueues,
      distinctUserCompanies,
      distinctAssetCompanies,
      distinctDepts,
    ] = await Promise.all([
      prisma.assetCategory.findMany({
        where: { isActive: true },
        select: { id: true, name: true, icon: true, parentId: true, sortOrder: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.location.findMany({
        where: { isActive: true },
        select: { id: true, name: true, building: true, floor: true },
        orderBy: { name: 'asc' },
      }),
      prisma.vendor.findMany({
        where: { isActive: true },
        select: { id: true, name: true, email: true, phone: true, contactPerson: true },
        orderBy: { name: 'asc' },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          department: true,
          position: true,
          companyName: true,
          avatarUrl: true,
          role: { select: { id: true, name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.iTService.findMany({
        select: {
          id: true,
          name: true,
          serviceCode: true,
          serviceType: true,
          status: true,
          billingCycle: true,
          companyName: true,
          vendorId: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.supportTeam.findMany({
        where: { isActive: true },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          queues: { select: { id: true, name: true, code: true, isDefault: true } },
          members: {
            include: {
              user: { select: { id: true, fullName: true, email: true, department: true } },
            },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.supportQueue.findMany({
        where: { isActive: true },
        include: {
          team: { select: { id: true, name: true, code: true } },
        },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      prisma.user.findMany({
        where: { companyName: { not: null } },
        select: { companyName: true },
        distinct: ['companyName'],
      }),
      prisma.asset.findMany({
        where: { companyName: { not: null } },
        select: { companyName: true },
        distinct: ['companyName'],
      }),
      prisma.user.findMany({
        where: { department: { not: null } },
        select: { department: true },
        distinct: ['department'],
      }),
    ]);

    const defaultCompanies = [
      'Tập đoàn Công nghệ Mẫu',
      'Công ty Cổ phần Công nghệ ABC',
      'Chi nhánh Miền Nam',
      'Chi nhánh Miền Trung',
      'Chi nhánh Hà Nội',
      'Chi nhánh Công nghệ Phụ trợ',
      'Trung tâm Nghiên cứu & Phát triển R&D',
    ];

    const allCompaniesSet = new Set<string>([
      ...defaultCompanies,
      ...distinctUserCompanies.map((u) => u.companyName!).filter(Boolean),
      ...distinctAssetCompanies.map((a) => a.companyName!).filter(Boolean),
    ]);

    const defaultDepts = [
      'IT / Kỹ thuật',
      'Ban Giám Đốc',
      'Kế toán & Tài chính',
      'Kinh doanh & Bán hàng',
      'Marketing & Truyền thông',
      'Nhân sự / HR',
      'Vận hành & Sản xuất',
      'Hành chính & Quản trị',
    ];

    const allDeptsSet = new Set<string>([
      ...defaultDepts,
      ...distinctDepts.map((d) => d.department!).filter(Boolean),
    ]);

    const payload = {
      success: true,
      data: {
        categories,
        locations,
        vendors,
        users,
        services,
        supportTeams,
        supportQueues,
        companies: Array.from(allCompaniesSet),
        departments: Array.from(allDeptsSet),
      },
    };

    masterDataCache = { timestamp: Date.now(), data: payload };
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Master data fetch error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch master data' }, { status: 500 });
  }
}
