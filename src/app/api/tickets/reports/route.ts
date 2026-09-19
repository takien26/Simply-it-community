import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const canView = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'reports.view'));
    if (!canView) {
      return NextResponse.json({ success: false, error: 'Forbidden: Bạn không có quyền xem báo cáo thống kê' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'this_month';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const companyName = searchParams.get('companyName');
    const department = searchParams.get('department');
    const requesterId = searchParams.get('requesterId');
    const teamId = searchParams.get('teamId');
    const assignedToId = searchParams.get('assignedToId');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');
    const status = searchParams.get('status');

    // Build Date Filter
    let dateFilter: any = {};
    const now = new Date();

    if (timeRange === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      dateFilter = { gte: startOfDay, lte: endOfDay };
    } else if (timeRange === 'this_week') {
      const day = now.getDay() || 7;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - day + 1);
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfWeek };
    } else if (timeRange === 'last_30_days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: past30 };
    } else if (timeRange === 'this_month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      dateFilter = { gte: startOfMonth };
    } else if (timeRange === 'this_quarter') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
      dateFilter = { gte: startOfQuarter };
    } else if (timeRange === 'this_year') {
      const startOfYear = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      dateFilter = { gte: startOfYear };
    } else if (timeRange === 'custom' && startDateParam) {
      const start = new Date(startDateParam);
      const end = endDateParam ? new Date(endDateParam) : new Date();
      end.setHours(23, 59, 59, 999);
      dateFilter = { gte: start, lte: end };
    }

    // Build Where Clause
    const where: any = {};
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter;
    }
    if (companyName && companyName !== 'ALL') {
      where.companyName = companyName;
    }
    if (requesterId && requesterId !== 'ALL') {
      where.createdById = requesterId;
    }
    if (teamId && teamId !== 'ALL') {
      where.teamId = teamId;
    }
    if (assignedToId && assignedToId !== 'ALL') {
      where.assignedToId = assignedToId;
    }
    if (category && category !== 'ALL') {
      where.category = category;
    }
    if (priority && priority !== 'ALL') {
      where.priority = priority;
    }
    if (status && status !== 'ALL') {
      where.status = status;
    }

    // Fetch Tickets with full relations
    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            brand: true,
            model: true,
          },
        },
        incident: {
          select: {
            id: true,
            incidentNumber: true,
            title: true,
            severity: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Master list of Teams & Technicians for filter options
    const [allTeams, allUsers, allIncidents] = await Promise.all([
      prisma.supportTeam.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, companyScope: true },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          fullName: true,
          email: true,
          department: true,
          role: { select: { name: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.incident.findMany({
        where: Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {},
        select: {
          id: true,
          incidentNumber: true,
          title: true,
          severity: true,
          status: true,
          startedAt: true,
          resolvedAt: true,
          team: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Compute KPIs
    const totalTickets = tickets.length;
    let openCount = 0;
    let inProgressCount = 0;
    let waitingCount = 0;
    let resolvedCount = 0;
    let closedCount = 0;
    let onTimeSlaCount = 0;
    let breachedSlaCount = 0;
    let totalResolutionMinutes = 0;
    let resolvedTicketsCount = 0;
    let aiAutoRoutedCount = 0;
    let totalActualSpentMinutes = 0;
    let sumCsatScore = 0;
    let totalRatedTickets = 0;
    let satisfiedCount = 0;

    const categoryMap: Record<string, { count: number; resolvedCount: number; totalMinutes: number }> = {};
    const priorityMap: Record<string, number> = { URGENT: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    const companyMap: Record<string, {
      companyName: string;
      total: number;
      resolved: number;
      breachedSla: number;
      requesters: Record<string, { id: string; fullName: string; department: string; count: number }>;
    }> = {};

    const teamMap: Record<string, {
      teamId: string;
      teamName: string;
      teamCode: string;
      total: number;
      resolved: number;
      onTimeSla: number;
      breachedSla: number;
      totalMinutes: number;
      technicians: Record<string, { userId: string; fullName: string; email: string; total: number; resolved: number; onTimeSla: number }>;
    }> = {};

    const technicianMap: Record<string, {
      userId: string;
      fullName: string;
      email: string;
      department: string;
      total: number;
      resolved: number;
      onTimeSla: number;
      breachedSla: number;
      totalMinutes: number;
      actualSpentMinutes: number;
      sumRating: number;
      ratedCount: number;
    }> = {};

    const faultyAssetMap: Record<string, {
      id: string;
      assetTag: string;
      name: string;
      brand?: string | null;
      model?: string | null;
      ticketCount: number;
      openCount: number;
      latestTicketTitle?: string;
      companyName?: string | null;
    }> = {};

    const trendDateMap: Record<string, { date: string; created: number; resolved: number; breached: number }> = {};

    tickets.forEach((t) => {
      // Status
      if (t.status === 'OPEN') openCount++;
      else if (t.status === 'IN_PROGRESS') inProgressCount++;
      else if (t.status === 'WAITING') waitingCount++;
      else if (t.status === 'RESOLVED') resolvedCount++;
      else if (t.status === 'CLOSED') closedCount++;

      // AI auto routing
      if (t.isAutoRouted) aiAutoRoutedCount++;

      // Priority
      if (priorityMap[t.priority] !== undefined) {
        priorityMap[t.priority]++;
      }

      // 1. SLA Deadline with accurate priority fallback
      const slaHours =
        t.priority === 'URGENT' ? 4 :
        t.priority === 'HIGH' ? 24 :
        t.priority === 'MEDIUM' ? 48 : 72;
      const deadline = t.slaDeadline
        ? new Date(t.slaDeadline)
        : new Date(new Date(t.createdAt).getTime() + slaHours * 60 * 60 * 1000);

      // 2. Determine if completed and effective done time
      const isDone = t.status === 'RESOLVED' || t.status === 'CLOSED';
      const effectiveDoneTime = t.resolvedAt
        ? new Date(t.resolvedAt)
        : isDone
        ? new Date(t.updatedAt || t.createdAt)
        : null;

      // 3. SLA Compliance
      let isBreached = false;
      if (isDone && effectiveDoneTime) {
        if (effectiveDoneTime.getTime() > deadline.getTime()) {
          isBreached = true;
          breachedSlaCount++;
        } else {
          onTimeSlaCount++;
        }
      } else if (!isDone) {
        if (now.getTime() > deadline.getTime()) {
          isBreached = true;
          breachedSlaCount++;
        } else {
          onTimeSlaCount++;
        }
      }

      // 4. Resolution Time (MTTR)
      let resolutionMinutes = 0;
      if (isDone && effectiveDoneTime) {
        const created = new Date(t.createdAt).getTime();
        resolutionMinutes = Math.max(1, Math.round((effectiveDoneTime.getTime() - created) / (1000 * 60)));
        totalResolutionMinutes += resolutionMinutes;
        resolvedTicketsCount++;
      }

      // Time Tracking & CSAT
      const actualMinutes = (t as any).actualSpentMinutes || 0;
      totalActualSpentMinutes += actualMinutes;

      if (t.rating != null && t.rating > 0) {
        sumCsatScore += t.rating;
        totalRatedTickets++;
        if (t.rating >= 4) satisfiedCount++;
      }

      // Chronic Faulty Assets
      if (t.asset) {
        const aId = t.asset.id;
        if (!faultyAssetMap[aId]) {
          faultyAssetMap[aId] = {
            id: aId,
            assetTag: t.asset.assetTag,
            name: t.asset.name,
            brand: t.asset.brand,
            model: t.asset.model,
            ticketCount: 0,
            openCount: 0,
            latestTicketTitle: t.title,
            companyName: t.companyName || null,
          };
        }
        faultyAssetMap[aId].ticketCount++;
        if (t.status !== 'RESOLVED' && t.status !== 'CLOSED') {
          faultyAssetMap[aId].openCount++;
        }
      }

      // Category Map
      const cat = t.category || 'OTHER';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { count: 0, resolvedCount: 0, totalMinutes: 0 };
      }
      categoryMap[cat].count++;
      if (t.resolvedAt) {
        categoryMap[cat].resolvedCount++;
        categoryMap[cat].totalMinutes += resolutionMinutes;
      }

      // Company Map
      const compName = t.companyName || 'Công ty chung / Khác';
      if (!companyMap[compName]) {
        companyMap[compName] = {
          companyName: compName,
          total: 0,
          resolved: 0,
          breachedSla: 0,
          requesters: {},
        };
      }
      companyMap[compName].total++;
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') companyMap[compName].resolved++;
      if (isBreached) companyMap[compName].breachedSla++;

      if (t.createdBy) {
        const reqId = t.createdBy.id;
        if (!companyMap[compName].requesters[reqId]) {
          companyMap[compName].requesters[reqId] = {
            id: reqId,
            fullName: t.createdBy.fullName,
            department: t.createdBy.department || 'N/A',
            count: 0,
          };
        }
        companyMap[compName].requesters[reqId].count++;
      }

      // Team Map
      const tId = t.teamId || 'UNASSIGNED_TEAM';
      const tName = t.team?.name || 'Chưa phân Team';
      const tCode = t.team?.code || 'NONE';
      if (!teamMap[tId]) {
        teamMap[tId] = {
          teamId: tId,
          teamName: tName,
          teamCode: tCode,
          total: 0,
          resolved: 0,
          onTimeSla: 0,
          breachedSla: 0,
          totalMinutes: 0,
          technicians: {},
        };
      }
      teamMap[tId].total++;
      if (isDone) teamMap[tId].resolved++;
      if (isBreached) teamMap[tId].breachedSla++;
      else teamMap[tId].onTimeSla++;
      if (isDone && resolutionMinutes > 0) teamMap[tId].totalMinutes += resolutionMinutes;

      // Technician Map
      if (t.assignedTo) {
        const techId = t.assignedTo.id;
        if (!technicianMap[techId]) {
          technicianMap[techId] = {
            userId: techId,
            fullName: t.assignedTo.fullName,
            email: t.assignedTo.email,
            department: t.assignedTo.department || 'IT Support',
            total: 0,
            resolved: 0,
            onTimeSla: 0,
            breachedSla: 0,
            totalMinutes: 0,
            actualSpentMinutes: 0,
            sumRating: 0,
            ratedCount: 0,
          };
        }
        technicianMap[techId].total++;
        technicianMap[techId].actualSpentMinutes += actualMinutes;
        if (t.rating != null && t.rating > 0) {
          technicianMap[techId].sumRating += t.rating;
          technicianMap[techId].ratedCount++;
        }
        if (isDone) technicianMap[techId].resolved++;
        if (isBreached) technicianMap[techId].breachedSla++;
        else technicianMap[techId].onTimeSla++;
        if (isDone && resolutionMinutes > 0) technicianMap[techId].totalMinutes += resolutionMinutes;

        // Sub-technician in team
        if (!teamMap[tId].technicians[techId]) {
          teamMap[tId].technicians[techId] = {
            userId: techId,
            fullName: t.assignedTo.fullName,
            email: t.assignedTo.email,
            total: 0,
            resolved: 0,
            onTimeSla: 0,
          };
        }
        teamMap[tId].technicians[techId].total++;
        if (isDone) teamMap[tId].technicians[techId].resolved++;
        if (!isBreached) teamMap[tId].technicians[techId].onTimeSla++;
      }

      // Trend by Date
      const dateKey = new Date(t.createdAt).toISOString().split('T')[0];
      if (!trendDateMap[dateKey]) {
        trendDateMap[dateKey] = { date: dateKey, created: 0, resolved: 0, breached: 0 };
      }
      trendDateMap[dateKey].created++;
      if (isDone) trendDateMap[dateKey].resolved++;
      if (isBreached) trendDateMap[dateKey].breached++;
    });

    const avgResolutionHours = resolvedTicketsCount > 0
      ? Number((totalResolutionMinutes / resolvedTicketsCount / 60).toFixed(1))
      : 0;

    const totalEvaluatedSla = onTimeSlaCount + breachedSlaCount;
    const slaComplianceRate = totalEvaluatedSla > 0
      ? Math.round((onTimeSlaCount / totalEvaluatedSla) * 100)
      : 0;

    const topFaultyAssets = Object.values(faultyAssetMap)
      .sort((a, b) => b.ticketCount - a.ticketCount)
      .slice(0, 8);

    const chronicAssetsCount = Object.values(faultyAssetMap).filter((a) => a.ticketCount >= 2).length;
    const totalActualSpentHours = Number((totalActualSpentMinutes / 60).toFixed(1));
    const avgCsatRating = totalRatedTickets > 0 ? Number((sumCsatScore / totalRatedTickets).toFixed(1)) : 0;
    const csatSatisfactionRate = totalRatedTickets > 0 ? Math.round((satisfiedCount / totalRatedTickets) * 100) : 0;

    const categoryStats = Object.keys(categoryMap).map((k) => ({
      category: k,
      count: categoryMap[k].count,
      percentage: totalTickets > 0 ? Math.round((categoryMap[k].count / totalTickets) * 100) : 0,
      avgHours: categoryMap[k].resolvedCount > 0 ? Number((categoryMap[k].totalMinutes / categoryMap[k].resolvedCount / 60).toFixed(1)) : 0,
    })).sort((a, b) => b.count - a.count);

    const companyStats = Object.values(companyMap).map((c) => ({
      companyName: c.companyName,
      total: c.total,
      resolved: c.resolved,
      breachedSla: c.breachedSla,
      resolutionRate: c.total > 0 ? Math.round((c.resolved / c.total) * 100) : 0,
      topRequesters: Object.values(c.requesters).sort((a, b) => b.count - a.count).slice(0, 5),
    })).sort((a, b) => b.total - a.total);

    const teamStats = Object.values(teamMap).map((t) => ({
      teamId: t.teamId,
      teamName: t.teamName,
      teamCode: t.teamCode,
      total: t.total,
      resolved: t.resolved,
      onTimeSla: t.onTimeSla,
      breachedSla: t.breachedSla,
      slaRate: (t.onTimeSla + t.breachedSla) > 0 ? Math.round((t.onTimeSla / (t.onTimeSla + t.breachedSla)) * 100) : 100,
      avgHours: t.resolved > 0 ? Number((t.totalMinutes / t.resolved / 60).toFixed(1)) : 0,
      technicians: Object.values(t.technicians).sort((a, b) => b.total - a.total),
    })).sort((a, b) => b.total - a.total);

    const technicianStats = Object.values(technicianMap).map((tech) => ({
      userId: tech.userId,
      fullName: tech.fullName,
      email: tech.email,
      department: tech.department,
      total: tech.total,
      resolved: tech.resolved,
      onTimeSla: tech.onTimeSla,
      breachedSla: tech.breachedSla,
      slaRate: (tech.onTimeSla + tech.breachedSla) > 0 ? Math.round((tech.onTimeSla / (tech.onTimeSla + tech.breachedSla)) * 100) : 100,
      avgHours: tech.resolved > 0 ? Number((tech.totalMinutes / tech.resolved / 60).toFixed(1)) : 0,
      actualSpentMinutes: tech.actualSpentMinutes,
      actualSpentHours: Number((tech.actualSpentMinutes / 60).toFixed(1)),
      avgRating: tech.ratedCount > 0 ? Number((tech.sumRating / tech.ratedCount).toFixed(1)) : null,
      ratedCount: tech.ratedCount,
    })).sort((a, b) => b.total - a.total);

    const trendStats = Object.values(trendDateMap).sort((a, b) => a.date.localeCompare(b.date));

    // Unique Companies list from actual database
    const rawCompanies = await prisma.ticket.findMany({
      where: { companyName: { not: null } },
      select: { companyName: true },
      distinct: ['companyName'],
    });
    const uniqueCompanies = rawCompanies.map((c) => c.companyName).filter(Boolean) as string[];

    const enrichedTickets = tickets.map((t) => {
      const slaHours =
        t.priority === 'URGENT' ? 4 :
        t.priority === 'HIGH' ? 24 :
        t.priority === 'MEDIUM' ? 48 : 72;
      const deadline = t.slaDeadline
        ? new Date(t.slaDeadline)
        : new Date(new Date(t.createdAt).getTime() + slaHours * 60 * 60 * 1000);
      const isDone = t.status === 'RESOLVED' || t.status === 'CLOSED';
      const effectiveDone = t.resolvedAt
        ? new Date(t.resolvedAt)
        : isDone
        ? new Date(t.updatedAt || t.createdAt)
        : null;
      const isBreached = isDone
        ? (effectiveDone ? effectiveDone.getTime() > deadline.getTime() : false)
        : now.getTime() > deadline.getTime();
      return {
        ...t,
        slaDeadline: deadline.toISOString(),
        resolvedAt: effectiveDone ? effectiveDone.toISOString() : null,
        isBreached,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTickets,
          openTickets: openCount,
          inProgressTickets: inProgressCount,
          waitingTickets: waitingCount,
          resolvedTickets: resolvedCount,
          closedTickets: closedCount,
          onTimeSlaCount,
          breachedSlaCount,
          slaComplianceRate,
          avgResolutionHours,
          aiAutoRoutedCount,
          totalActualSpentMinutes,
          totalActualSpentHours,
          avgCsatRating,
          csatSatisfactionRate,
          totalRatedTickets,
          chronicAssetsCount,
        },
        incidentsSummary: {
          totalIncidents: allIncidents.length,
          criticalIncidents: allIncidents.filter((i) => i.severity === 'CRITICAL_P1' || i.severity === 'HIGH_P2').length,
          resolvedIncidents: allIncidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
          recentIncidents: allIncidents.slice(0, 6),
        },
        priorityStats: priorityMap,
        categoryStats,
        companyStats,
        teamStats,
        technicianStats,
        trendStats,
        topFaultyAssets,
        filterOptions: {
          companies: uniqueCompanies,
          teams: allTeams,
          technicians: allUsers.filter((u) => u.role?.name?.includes('Admin') || u.role?.name?.includes('Manager') || u.role?.name?.includes('Staff') || u.department?.includes('IT')),
          allUsers,
        },
        tickets: enrichedTickets,
      },
    });
  } catch (error: any) {
    console.error('Error fetching ticket reports:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi tải báo cáo' }, { status: 500 });
  }
}
