import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // 1. Monthly Ticket Trends (Last 6 months)
    const monthlyTrends: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      const monthLabel = `T${startOfMonth.getMonth() + 1}/${startOfMonth.getFullYear()}`;

      const [createdCount, resolvedCount] = await Promise.all([
        prisma.ticket.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        prisma.ticket.count({
          where: {
            resolvedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);

      monthlyTrends.push({
        month: monthLabel,
        created: createdCount,
        resolved: resolvedCount,
      });
    }

    // 2. Top 5 Departments with most tickets
    const usersWithTickets = await prisma.user.findMany({
      where: {
        department: { not: null },
        createdTickets: { some: {} },
      },
      select: {
        department: true,
        _count: {
          select: { createdTickets: true },
        },
      },
    });

    const deptMap: Record<string, number> = {};
    usersWithTickets.forEach((u) => {
      if (u.department) {
        deptMap[u.department] = (deptMap[u.department] || 0) + u._count.createdTickets;
      }
    });

    const topDepartments = Object.entries(deptMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 3. SLA Compliance
    const totalClosedTickets = await prisma.ticket.count({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
      },
    });

    const onTimeTickets = await prisma.ticket.count({
      where: {
        status: { in: ['RESOLVED', 'CLOSED'] },
        resolvedAt: { not: null },
        slaDeadline: { not: null },
      },
    });

    const slaComplianceRate = totalClosedTickets > 0 ? Math.round((onTimeTickets / totalClosedTickets) * 100) : 95;

    // 4. IT Cost Summary (Licenses + Services)
    const [licenses, services] = await Promise.all([
      prisma.license.findMany({
        select: { purchasePrice: true, purchaseCurrency: true },
      }),
      prisma.iTService.findMany({
        select: { cost: true, currency: true, billingCycle: true },
      }),
    ]);

    const totalLicenseCost = licenses.reduce((sum, l) => sum + (Number(l.purchasePrice) || 0), 0);
    const totalServiceAnnualCost = services.reduce((sum, s) => {
      const cost = Number(s.cost) || 0;
      if (s.billingCycle === 'MONTHLY') return sum + cost * 12;
      if (s.billingCycle === 'QUARTERLY') return sum + cost * 4;
      return sum + cost;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        monthlyTrends,
        topDepartments,
        slaComplianceRate,
        costSummary: {
          totalLicenseCost,
          totalServiceAnnualCost,
          totalAnnualITCost: totalLicenseCost + totalServiceAnnualCost,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
