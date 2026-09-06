import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');
    const technicianId = searchParams.get('technicianId');

    const where: any = {};
    if (teamId) where.teamId = teamId;
    if (technicianId) where.assignedToId = technicianId;

    const allTickets = await prisma.ticket.findMany({
      where,
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        priority: true,
        status: true,
        createdAt: true,
        slaDeadline: true,
        originalSlaDeadline: true,
        isSlaExtended: true,
        slaExtensionReason: true,
        slaExtensionHistory: true,
        totalSlaPausedMinutes: true,
        assignedTo: { select: { id: true, fullName: true, department: true } },
        team: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const extendedTickets = allTickets.filter((t) => t.isSlaExtended);
    const totalCount = allTickets.length;
    const extendedCount = extendedTickets.length;
    const extensionRate = totalCount > 0 ? ((extendedCount / totalCount) * 100).toFixed(1) : '0';

    // Breakdown by technician
    const technicianBreakdown: Record<string, { name: string; total: number; extended: number }> = {};
    allTickets.forEach((t) => {
      const techName = t.assignedTo?.fullName || 'Chưa phân công';
      if (!technicianBreakdown[techName]) {
        technicianBreakdown[techName] = { name: techName, total: 0, extended: 0 };
      }
      technicianBreakdown[techName].total += 1;
      if (t.isSlaExtended) technicianBreakdown[techName].extended += 1;
    });

    // Breakdown by reason keywords
    const reasonBreakdown: Record<string, number> = {
      'Lỗi Database/Server sâu': 0,
      'Chờ linh kiện/Hãng bảo hành': 0,
      'Chờ người dùng cung cấp thông tin/log': 0,
      'Khác': 0,
    };

    extendedTickets.forEach((t) => {
      const r = (t.slaExtensionReason || '').toLowerCase();
      if (r.includes('linh kiện') || r.includes('hãng') || r.includes('phần cứng') || r.includes('bảo hành')) {
        reasonBreakdown['Chờ linh kiện/Hãng bảo hành'] += 1;
      } else if (r.includes('database') || r.includes('server') || r.includes('máy chủ') || r.includes('sql') || r.includes('erp')) {
        reasonBreakdown['Lỗi Database/Server sâu'] += 1;
      } else if (r.includes('user') || r.includes('người dùng') || r.includes('log') || r.includes('tài khoản')) {
        reasonBreakdown['Chờ người dùng cung cấp thông tin/log'] += 1;
      } else {
        reasonBreakdown['Khác'] += 1;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTickets: totalCount,
          extendedTickets: extendedCount,
          extensionRate: `${extensionRate}%`,
          totalPausedTickets: allTickets.filter((t) => t.totalSlaPausedMinutes > 0).length,
        },
        technicianBreakdown: Object.values(technicianBreakdown).map((tech) => ({
          ...tech,
          rate: tech.total > 0 ? ((tech.extended / tech.total) * 100).toFixed(1) + '%' : '0%',
        })),
        reasonBreakdown,
        extendedList: extendedTickets.map((t) => ({
          id: t.id,
          ticketNumber: t.ticketNumber,
          title: t.title,
          priority: t.priority,
          technician: t.assignedTo?.fullName || 'N/A',
          team: t.team?.name || 'N/A',
          originalDeadline: t.originalSlaDeadline || t.slaDeadline,
          currentDeadline: t.slaDeadline,
          reason: t.slaExtensionReason,
          history: t.slaExtensionHistory,
          totalPausedMinutes: t.totalSlaPausedMinutes,
        })),
      },
    });
  } catch (error) {
    console.error('SLA audit report error:', error);
    return NextResponse.json({ error: 'Failed to generate SLA audit report' }, { status: 500 });
  }
}
