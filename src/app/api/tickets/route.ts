import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncExpiryTickets } from '@/lib/auto-tickets';
import { routeTicket } from '@/lib/routing-engine';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { broadcastRealtimeEvent } from '@/lib/realtime';
import { dispatchWebhookEvent } from '@/lib/webhooks';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tự động kiểm tra và tạo Ticket mới cho License/Dịch vụ hết hạn trong nền (non-blocking)
    syncExpiryTickets().catch((err) =>
      console.error('Error in syncExpiryTickets on tickets GET:', err)
    );

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as TicketStatus | null;
    const priority = searchParams.get('priority') as TicketPriority | null;
    const category = searchParams.get('category') as TicketCategory | null;
    const assignedToId = searchParams.get('assignedToId');
    const createdById = searchParams.get('createdById');
    const teamId = searchParams.get('teamId');
    const queueId = searchParams.get('queueId');
    const incidentId = searchParams.get('incidentId');
    const unlinkedIncident = searchParams.get('unlinkedIncident') === 'true';
    const userRole = currentUser.roleName;
    const canManageAllTickets =
      userRole === 'Admin' ||
      userRole === 'Asset Manager' ||
      userRole?.toLowerCase().includes('admin') ||
      userRole?.toLowerCase().includes('manager');

    const where: any = {};

    // If user is a regular employee/staff, restrict to tickets they created or are assigned to
    if (!canManageAllTickets) {
      where.AND = [
        {
          OR: [
            { createdById: currentUser.userId },
            { assignedToId: currentUser.userId },
          ],
        },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;
    if (assignedToId) where.assignedToId = assignedToId;
    if (createdById) where.createdById = createdById;
    if (teamId) where.teamId = teamId;
    if (queueId) where.queueId = queueId;
    if (incidentId) where.incidentId = incidentId;
    if (unlinkedIncident) where.incidentId = null;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { createdBy: { fullName: { contains: search, mode: 'insensitive' } } },
        { assignedTo: { fullName: { contains: search, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: search, mode: 'insensitive' } } },
        { asset: { name: { contains: search, mode: 'insensitive' } } },
        { team: { name: { contains: search, mode: 'insensitive' } } },
        { queue: { name: { contains: search, mode: 'insensitive' } } },
        { incident: { incidentNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const pageParam = searchParams.get('page');
    const pageSizeParam = searchParams.get('pageSize');
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : null;
    const pageSize = pageSizeParam ? Math.max(1, Math.min(100, parseInt(pageSizeParam, 10) || 50)) : null;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        ...(page && pageSize ? { skip: (page - 1) * pageSize, take: pageSize } : {}),
        include: {
          createdBy: {
            select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
          },
          assignedTo: {
            select: { id: true, fullName: true, email: true, department: true, avatarUrl: true },
          },
          team: { select: { id: true, name: true, code: true } },
          queue: { select: { id: true, name: true, code: true } },
          incident: { select: { id: true, incidentNumber: true, title: true, severity: true, status: true } },
          mergedIntoTicket: { select: { id: true, ticketNumber: true, title: true, status: true } },
          mergedTickets: { select: { id: true, ticketNumber: true, title: true, status: true, createdAt: true, createdBy: { select: { id: true, fullName: true } } } },
          asset: {
            select: { id: true, assetTag: true, name: true, status: true },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.ticket.count({ where }),
    ]);

    // Fast status aggregation
    const statusCounts = await prisma.ticket.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });
    const statusMap: Record<string, number> = {};
    for (const sc of statusCounts) {
      statusMap[sc.status] = sc._count.status;
    }

    const urgentCount = await prisma.ticket.count({
      where: {
        ...where,
        priority: 'URGENT',
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
    });

    const stats = {
      total,
      open: statusMap['OPEN'] || 0,
      inProgress: statusMap['IN_PROGRESS'] || 0,
      waiting: statusMap['WAITING'] || 0,
      resolved: (statusMap['RESOLVED'] || 0) + (statusMap['CLOSED'] || 0),
      urgent: urgentCount,
      autoRouted: 0,
      unassigned: 0,
      csatAverage: 5.0,
      csatCount: 0,
    };

    return NextResponse.json({ tickets, stats, pagination: page && pageSize ? { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } : undefined });
  } catch (error) {
    console.error('List tickets error:', error);
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

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
      category,
      priority,
      status: initialStatus,
      assetId,
      customAssetName,
      assignedToId,
      createdById,
      requesterId,
      teamId,
      queueId,
      incidentId,
      companyName,
      dueDate,
      attachmentUrls,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Tiêu đề và mô tả không được để trống' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();

    // Calculate SLA deadline based on priority (P1 Urgent = 4h, P2 High = 8h, P3 Medium = 24h, P4 Low = 48h)
    const hoursMap: Record<string, number> = {
      URGENT: 4,
      HIGH: 8,
      MEDIUM: 24,
      LOW: 48,
    };
    const hours = hoursMap[priority || 'MEDIUM'] || 24;
    const slaDeadline = new Date(Date.now() + hours * 60 * 60 * 1000);

    const effectiveCreatedById = requesterId || createdById || currentUser.userId;
    const effectiveStatus = (initialStatus as TicketStatus) || 'OPEN';
    const isResolved = effectiveStatus === 'RESOLVED' || effectiveStatus === 'CLOSED';
    const isClosed = effectiveStatus === 'CLOSED';

    // Query the latest ticket for the current year to determine the next sequence number
    const latestTicket = await prisma.ticket.findFirst({
      where: {
        ticketNumber: {
          startsWith: `TK-${currentYear}-`,
        },
      },
      orderBy: { ticketNumber: 'desc' },
      select: { ticketNumber: true },
    });

    let baseSeq = 1;
    if (latestTicket?.ticketNumber) {
      const match = latestTicket.ticketNumber.match(/^TK-\d{4}-(\d+)/);
      if (match && match[1]) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed)) {
          baseSeq = parsed + 1;
        }
      }
    }

    let ticket: any = null;
    let attempts = 0;
    while (attempts < 5) {
      attempts++;
      const currentSeq = baseSeq + attempts - 1;
      const numPart = attempts === 1
        ? String(currentSeq).padStart(4, '0')
        : `${String(currentSeq).padStart(4, '0')}-${Date.now().toString().slice(-3)}${Math.floor(Math.random() * 90 + 10)}`;
      const ticketNumber = `TK-${currentYear}-${numPart}`;

      try {
        ticket = await prisma.ticket.create({
          data: {
            ticketNumber,
            title,
            description,
            category: category || 'HARDWARE',
            priority: priority || 'MEDIUM',
            status: effectiveStatus,
            resolvedAt: isResolved ? new Date() : null,
            createdById: effectiveCreatedById,
            assignedToId: assignedToId || null,
            teamId: teamId || null,
            queueId: queueId || null,
            incidentId: incidentId || null,
            assetId: assetId || null,
            customAssetName: customAssetName?.trim() || null,
            companyName: companyName || null,
            dueDate: dueDate ? new Date(dueDate) : null,
            slaDeadline,
            attachmentUrls: attachmentUrls || null,
          },
        });
        break;
      } catch (createErr: any) {
        if (createErr.code === 'P2002' && attempts < 5) {
          continue;
        }
        throw createErr;
      }
    }

    // Run Ticket Routing Engine automatically if not explicitly assigned
    if (!assignedToId && !teamId) {
      await routeTicket(ticket.id).catch((err) =>
        console.error('Error during auto-routing ticket:', err)
      );
    }

    // Re-fetch with full relations
    const fullTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
      include: {
        createdBy: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        assignedTo: {
          select: { id: true, fullName: true, email: true, department: true },
        },
        team: { select: { id: true, name: true, code: true } },
        queue: { select: { id: true, name: true, code: true } },
        incident: { select: { id: true, incidentNumber: true, title: true } },
        asset: {
          select: { id: true, assetTag: true, name: true },
        },
      },
    });

    // Trigger Email Notification (non-blocking)
    if (fullTicket) {
      (async () => {
        try {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const ticketLink = `${appUrl}/tickets`;

          // 1. Email to Assignee if assigned
          if (fullTicket.assignedTo?.email) {
            await sendEmail({
              to: fullTicket.assignedTo.email,
              templateCode: 'ticket.assigned',
              data: {
                ticketNumber: fullTicket.ticketNumber,
                title: fullTicket.title,
                priority: fullTicket.priority,
                creatorName: fullTicket.createdBy?.fullName || 'Người dùng',
                assigneeName: fullTicket.assignedTo.fullName,
                slaDeadline: fullTicket.slaDeadline ? new Date(fullTicket.slaDeadline).toLocaleString('vi-VN') : 'Không có',
                link: ticketLink,
              },
            });
          }

          // 2. Email confirmation to Creator
          if (fullTicket.createdBy?.email && fullTicket.createdBy.id !== currentUser.userId) {
            await sendEmail({
              to: fullTicket.createdBy.email,
              templateCode: 'ticket.created',
              data: {
                recipientName: fullTicket.createdBy.fullName,
                ticketNumber: fullTicket.ticketNumber,
                title: fullTicket.title,
                priority: fullTicket.priority,
                creatorName: fullTicket.createdBy.fullName,
                description: fullTicket.description,
                link: ticketLink,
              },
            });
          }
        } catch (mailErr) {
          console.error('[Ticket Email Notification Error]:', mailErr);
        }
      })();

      // Broadcast real-time SSE event to all users/technicians
      broadcastRealtimeEvent({
        type: 'TICKET_CREATED',
        title: `🎫 Ticket mới: ${fullTicket?.ticketNumber || ticket.ticketNumber}`,
        message: `${fullTicket?.createdBy?.fullName || 'Người dùng'} vừa gửi yêu cầu: "${ticket.title}"`,
        data: { ticketId: ticket.id, ticketNumber: ticket.ticketNumber },
      });

      // Dispatch Webhooks (Telegram, Teams, Slack, etc.)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001';
      dispatchWebhookEvent('ticket.created', {
        ticketId: fullTicket.id,
        ticketNumber: fullTicket.ticketNumber,
        title: fullTicket.title,
        priority: fullTicket.priority,
        category: fullTicket.category,
        creator: fullTicket.createdBy?.fullName || 'Người dùng',
        assignedTo: fullTicket.assignedTo?.fullName || 'Chưa gán',
        description: fullTicket.description?.slice(0, 200),
        link: `${appUrl}/tickets`,
      }).catch((err) => console.error('[Webhook Ticket Created Error]:', err));

      if (fullTicket.priority === 'URGENT') {
        dispatchWebhookEvent('ticket.urgent', {
          ticketId: fullTicket.id,
          ticketNumber: fullTicket.ticketNumber,
          title: fullTicket.title,
          priority: 'URGENT (P1 Khẩn Cấp)',
          category: fullTicket.category,
          creator: fullTicket.createdBy?.fullName || 'Người dùng',
          assignedTo: fullTicket.assignedTo?.fullName || 'Chưa gán',
          slaDeadline: fullTicket.slaDeadline ? new Date(fullTicket.slaDeadline).toLocaleString('vi-VN') : '4 giờ',
          description: fullTicket.description?.slice(0, 200),
          link: `${appUrl}/tickets`,
        }).catch((err) => console.error('[Webhook Ticket Urgent Error]:', err));
      }
    }

    return NextResponse.json(fullTicket || ticket, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
