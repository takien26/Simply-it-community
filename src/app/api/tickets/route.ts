import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncExpiryTickets } from '@/lib/auto-tickets';
import { routeTicket } from '@/lib/routing-engine';
import { TicketCategory, TicketPriority, TicketStatus } from '@prisma/client';
import { sendEmail } from '@/lib/email';
import { broadcastRealtimeEvent } from '@/lib/realtime';

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

    const tickets = await prisma.ticket.findMany({
      where,
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
    });

    const sourceList = Object.keys(where).length === 0
      ? tickets
      : await prisma.ticket.findMany({
          select: { status: true, priority: true, teamId: true, isAutoRouted: true },
        });

    const stats = {
      total: sourceList.length,
      open: sourceList.filter((t) => t.status === 'OPEN').length,
      inProgress: sourceList.filter((t) => t.status === 'IN_PROGRESS').length,
      waiting: sourceList.filter((t) => t.status === 'WAITING').length,
      resolved: sourceList.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
      urgent: sourceList.filter(
        (t) => t.priority === 'URGENT' && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
      ).length,
      autoRouted: sourceList.filter((t) => t.isAutoRouted).length,
      unassigned: sourceList.filter((t) => !t.teamId).length,
    };

    return NextResponse.json({ tickets, stats });
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
    const count = await prisma.ticket.count();
    const ticketNumber = `TK-${currentYear}-${String(count + 1).padStart(4, '0')}`;

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

    const ticket = await prisma.ticket.create({
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
    }

    return NextResponse.json(fullTicket || ticket, { status: 201 });
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}
