import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [locations, services, categories, users, teams, queues, distinctUserCompanies, distinctAssetCompanies, distinctDepts] =
      await Promise.all([
        prisma.location.findMany({
          where: { isActive: true },
          select: { id: true, name: true, building: true, floor: true },
          orderBy: { name: 'asc' },
        }),
        prisma.iTService.findMany({
          select: { id: true, name: true, serviceCode: true, serviceType: true },
          orderBy: { name: 'asc' },
        }),
        prisma.assetCategory.findMany({
          where: { isActive: true },
          select: { id: true, name: true, icon: true, parentId: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, fullName: true, email: true, department: true, position: true, role: { select: { name: true } } },
          orderBy: { fullName: 'asc' },
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

    // Consolidate unique companies
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

    return NextResponse.json({
      success: true,
      data: {
        locations,
        services,
        categories,
        users,
        teams,
        queues,
        companies: Array.from(allCompaniesSet),
        departments: Array.from(allDeptsSet),
      },
    });
  } catch (error: any) {
    console.error('Fetch routing master data error:', error);
    return NextResponse.json({ error: 'Failed to fetch routing master data' }, { status: 500 });
  }
}
