import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: {
        role: true,
        manager: { select: { id: true, fullName: true, email: true } },
        location: { select: { id: true, name: true, building: true, floor: true } },
        assetAssignments: {
          where: { returnedAt: null },
          include: {
            asset: {
              include: {
                category: { select: { name: true } },
                vendor: { select: { name: true } },
              },
            },
          },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: {
            license: {
              include: {
                vendor: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    const isManagementRole =
      currentUser.roleName === 'Admin' ||
      currentUser.roleName === 'Asset Manager' ||
      user?.role.name === 'Admin' ||
      user?.role.name === 'Asset Manager';

    // If User / Staff, return personalized Self-Service Portal stats
    if (!isManagementRole) {
      const myTickets = await prisma.ticket.findMany({
        where: {
          OR: [
            { createdById: currentUser.userId },
            { assignedToId: currentUser.userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          assignedTo: { select: { fullName: true, email: true } },
          createdBy: { select: { fullName: true, email: true } },
          asset: { select: { name: true, assetTag: true } },
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          isUserDashboard: true,
          userProfile: {
            id: user?.id,
            fullName: user?.fullName,
            email: user?.email,
            department: user?.department,
            phone: user?.phone,
            roleName: user?.role.name,
            manager: user?.manager,
            location: user?.location,
          },
          myAssets: user?.assetAssignments?.map((aa) => ({
            id: aa.asset.id,
            name: aa.asset.name,
            assetTag: aa.asset.assetTag,
            serialNumber: aa.asset.serialNumber,
            status: aa.asset.status,
            condition: aa.asset.condition,
            categoryName: aa.asset.category?.name,
            assignedAt: aa.assignedAt,
            specs: aa.asset.specs,
          })) || [],
          myLicenses: user?.licenseAssignments?.map((la) => ({
            id: la.license.id,
            name: la.license.name,
            licenseType: la.license.licenseType,
            licenseKey: la.license.licenseKey,
            expiryDate: la.license.expiryDate,
            status: la.license.status,
            assignedAt: la.assignedAt,
          })) || [],
          myTickets,
          totalMyTickets: myTickets.length,
          totalMyPendingTickets: myTickets.filter((t) => ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(t.status)).length,
          totalMyResolvedTickets: myTickets.filter((t) => ['RESOLVED', 'CLOSED'].includes(t.status)).length,
        },
      });
    }

    // 1. Asset Statistics (For Management Roles)
    const [totalAssets, availableAssets, inUseAssets, maintenanceAssets, retiredAssets] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { status: 'IN_USE' } }),
      prisma.asset.count({ where: { status: 'MAINTENANCE' } }),
      prisma.asset.count({ where: { status: 'RETIRED' } }),
    ]);

    // 2. License Statistics & Cost
    const totalLicenses = await prisma.license.count();
    const activeLicenses = await prisma.license.count({ where: { status: 'ACTIVE' } });

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoonLicenses = await prisma.license.count({
      where: {
        status: 'ACTIVE',
        expiryDate: {
          gte: new Date(),
          lte: thirtyDaysFromNow,
        },
      },
    });

    const allLicenses = await prisma.license.findMany({
      select: { purchasePrice: true, purchaseCurrency: true, licenseType: true },
    });
    const licenseCostTotal = allLicenses.reduce((sum, lic) => {
      const price = Number(lic.purchasePrice) || 0;
      return sum + price;
    }, 0);

    // 3. IT Service & Subscription Statistics & Annual Cost
    const [totalServices, activeServices, allServicesList] = await Promise.all([
      prisma.iTService.count(),
      prisma.iTService.count({ where: { status: 'ACTIVE' } }),
      prisma.iTService.findMany({
        select: { cost: true, billingCycle: true, status: true },
      }),
    ]);

    const serviceAnnualCost = allServicesList.reduce((sum, s) => {
      if (s.status !== 'ACTIVE') return sum;
      const c = Number(s.cost) || 0;
      if (s.billingCycle === 'MONTHLY') return sum + c * 12;
      if (s.billingCycle === 'QUARTERLY') return sum + c * 4;
      if ((s.billingCycle as string) === 'YEARLY' || (s.billingCycle as string) === 'ANNUAL') return sum + c;
      return sum + c;
    }, 0);

    const totalAnnualCost = serviceAnnualCost + licenseCostTotal;

    // 4. Ticket Statistics & Status Breakdown (Matching Brand Book)
    const [
      totalTickets,
      openTickets,
      inProgressTickets,
      waitingTickets,
      resolvedTickets,
      closedTickets,
      recentTicketsList,
      allYearTickets,
    ] = await Promise.all([
      prisma.ticket.count(),
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({ where: { status: 'WAITING' } }),
      prisma.ticket.count({ where: { status: 'RESOLVED' } }),
      prisma.ticket.count({ where: { status: 'CLOSED' } }),
      prisma.ticket.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { fullName: true, email: true, department: true } },
          assignedTo: { select: { fullName: true, email: true } },
          asset: { select: { name: true, assetTag: true } },
        },
      }),
      prisma.ticket.findMany({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), 0, 1),
          },
        },
        select: { createdAt: true, status: true },
      }),
    ]);

    // Monthly Trend T1 -> T12
    const monthlyCounts = Array(12).fill(0);
    allYearTickets.forEach((t) => {
      const month = new Date(t.createdAt).getMonth();
      if (month >= 0 && month < 12) {
        monthlyCounts[month] += 1;
      }
    });

    const monthlyTrend = [
      { month: 'T1', count: monthlyCounts[0], label: 'Tháng 1' },
      { month: 'T2', count: monthlyCounts[1], label: 'Tháng 2' },
      { month: 'T3', count: monthlyCounts[2], label: 'Tháng 3' },
      { month: 'T4', count: monthlyCounts[3], label: 'Tháng 4' },
      { month: 'T5', count: monthlyCounts[4], label: 'Tháng 5' },
      { month: 'T6', count: monthlyCounts[5], label: 'Tháng 6' },
      { month: 'T7', count: monthlyCounts[6], label: 'Tháng 7' },
      { month: 'T8', count: monthlyCounts[7], label: 'Tháng 8' },
      { month: 'T9', count: monthlyCounts[8], label: 'Tháng 9' },
      { month: 'T10', count: monthlyCounts[9], label: 'Tháng 10' },
      { month: 'T11', count: monthlyCounts[10], label: 'Tháng 11' },
      { month: 'T12', count: monthlyCounts[11], label: 'Tháng 12' },
    ];

    // 5. Category Breakdown
    const categoriesWithCount = await prisma.assetCategory.findMany({
      where: { parentId: null, isActive: true },
      select: {
        id: true,
        name: true,
        icon: true,
        _count: { select: { assets: true } },
      },
      orderBy: { assets: { _count: 'desc' } },
      take: 6,
    });

    // 6. Recent Audit Logs
    const recentActivities = await prisma.auditLog.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { fullName: true, email: true, role: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        assets: {
          total: totalAssets,
          available: availableAssets,
          inUse: inUseAssets,
          maintenance: maintenanceAssets,
          retired: retiredAssets,
        },
        licenses: {
          total: totalLicenses,
          active: activeLicenses,
          expiringSoon: expiringSoonLicenses,
          costTotal: licenseCostTotal,
        },
        services: {
          total: totalServices,
          active: activeServices,
          annualCost: serviceAnnualCost,
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          inProgress: inProgressTickets,
          waiting: waitingTickets,
          resolved: resolvedTickets,
          closed: closedTickets,
          statusBreakdown: [
            { name: 'Mới', value: openTickets, color: '#1976D2' },
            { name: 'Đang xử lý', value: inProgressTickets, color: '#00B8D4' },
            { name: 'Chờ phản hồi', value: waitingTickets, color: '#F59E0B' },
            { name: 'Đã đóng', value: (closedTickets + resolvedTickets), color: '#10B981' },
          ],
          monthlyTrend,
          recentTickets: recentTicketsList,
        },
        financial: {
          annualCost: totalAnnualCost,
          currency: 'VND',
        },
        categoryBreakdown: categoriesWithCount.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          count: c._count.assets,
        })),
        recentActivities,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch dashboard stats' }, { status: 500 });
  }
}
