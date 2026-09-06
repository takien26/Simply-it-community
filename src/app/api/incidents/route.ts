import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { IncidentSeverity, IncidentStatus } from '@prisma/client';

// GET — List incidents with KPI stats
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as IncidentStatus | null;
    const severity = searchParams.get('severity') as IncidentSeverity | null;
    const teamId = searchParams.get('teamId');
    const problemId = searchParams.get('problemId');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;
    if (teamId) where.teamId = teamId;
    if (problemId) where.problemId = problemId;

    if (search) {
      where.OR = [
        { incidentNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { impact: { contains: search, mode: 'insensitive' } },
      ];
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, department: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, avatarUrl: true, department: true },
        },
        team: { select: { id: true, name: true, code: true } },
        problem: { select: { id: true, problemNumber: true, title: true, status: true } },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdBy: { select: { fullName: true } },
          },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
        },
        _count: { select: { tickets: true, updates: true } },
      },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
    });

    const allIncidents = await prisma.incident.findMany({
      select: { severity: true, status: true, startedAt: true, resolvedAt: true },
    });

    const activeIncidents = allIncidents.filter(
      (i) => i.status === 'INVESTIGATING' || i.status === 'IDENTIFIED' || i.status === 'MONITORING'
    );

    const stats = {
      total: allIncidents.length,
      active: activeIncidents.length,
      p1Critical: activeIncidents.filter((i) => i.severity === 'CRITICAL_P1').length,
      p2Major: activeIncidents.filter((i) => i.severity === 'HIGH_P2').length,
      resolved: allIncidents.filter((i) => i.status === 'RESOLVED' || i.status === 'CLOSED').length,
    };

    return NextResponse.json({ success: true, data: incidents, stats });
  } catch (error) {
    console.error('List incidents error:', error);
    return NextResponse.json({ error: 'Failed to fetch incidents' }, { status: 500 });
  }
}

// POST — Create a new Incident & link tickets
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      severity,
      impact,
      affectedServices,
      affectedLocations,
      workaround,
      teamId,
      assignedToId,
      ticketIds,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Tiêu đề và mô tả sự cố không được để trống' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.incident.count();
    const incidentNumber = `INC-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const incident = await prisma.incident.create({
      data: {
        incidentNumber,
        title,
        description,
        severity: severity || 'MEDIUM_P3',
        status: 'INVESTIGATING',
        impact: impact || null,
        affectedServices: Array.isArray(affectedServices) ? affectedServices : [],
        affectedLocations: Array.isArray(affectedLocations) ? affectedLocations : [],
        workaround: workaround || null,
        teamId: teamId || null,
        assignedToId: assignedToId || null,
        createdById: currentUser.userId,
        // Link initial tickets if provided
        ...(ticketIds && Array.isArray(ticketIds) && ticketIds.length > 0
          ? {
              tickets: {
                connect: ticketIds.map((id: string) => ({ id })),
              },
            }
          : {}),
        updates: {
          create: {
            userId: currentUser.userId,
            content: `Sự cố ${incidentNumber} được khởi tạo với mức độ ${severity || 'MEDIUM_P3'}.`,
            statusChange: 'INVESTIGATING',
          },
        },
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        team: { select: { id: true, name: true } },
        tickets: { select: { id: true, ticketNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: incident }, { status: 201 });
  } catch (error) {
    console.error('Create incident error:', error);
    return NextResponse.json({ error: 'Failed to create incident' }, { status: 500 });
  }
}
