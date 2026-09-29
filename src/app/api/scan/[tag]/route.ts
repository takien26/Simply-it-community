import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: decodedTag.includes('-') && decodedTag.length === 36 ? decodedTag : undefined },
          { assetTag: decodedTag },
          { serialNumber: decodedTag },
        ].filter(Boolean) as any,
      },
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
        maintenanceLogs: {
          include: {
            performedBy: { select: { fullName: true } },
            vendor: { select: { name: true } },
          },
          orderBy: { performedAt: 'desc' },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            priority: true,
            status: true,
            createdAt: true,
            resolvedAt: true,
            assignedTo: {
              select: { id: true, fullName: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị với mã này' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: asset });
  } catch (error) {
    console.error('Scan API error:', error);
    return NextResponse.json({ error: 'Lỗi tra cứu thông tin thiết bị' }, { status: 500 });
  }
}

// POST /api/scan/[tag] - Self-service incident reporting from QR scan
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await params;
    const decodedTag = decodeURIComponent(tag);

    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { id: decodedTag.includes('-') && decodedTag.length === 36 ? decodedTag : undefined },
          { assetTag: decodedTag },
          { serialNumber: decodedTag },
        ].filter(Boolean) as any,
      },
      include: {
        assignments: {
          where: { returnedAt: null },
          include: { user: { select: { id: true, fullName: true, email: true } } },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy thiết bị để báo sự cố' }, { status: 404 });
    }

    const body = await request.json();
    const {
      senderName,
      senderContact,
      title,
      description,
      priority = 'MEDIUM',
      attachmentUrls,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập tiêu đề sự cố' }, { status: 400 });
    }
    if (!senderName || !senderName.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập họ và tên của bạn' }, { status: 400 });
    }
    if (!senderContact || !senderContact.trim()) {
      return NextResponse.json({ error: 'Vui lòng nhập Email hoặc Số điện thoại để IT liên hệ' }, { status: 400 });
    }

    // Resolve requester user id
    const { getCurrentUser } = await import('@/lib/auth');
    const currentUser = await getCurrentUser();
    let effectiveUserId = currentUser?.userId;

    if (!effectiveUserId) {
      const contactTrim = senderContact.trim();
      if (contactTrim.includes('@')) {
        const foundUser = await prisma.user.findFirst({
          where: { email: { equals: contactTrim, mode: 'insensitive' } },
          select: { id: true },
        });
        if (foundUser) effectiveUserId = foundUser.id;
      }
    }

    if (!effectiveUserId && asset.assignments?.[0]?.user?.id) {
      effectiveUserId = asset.assignments[0].user.id;
    }

    if (!effectiveUserId) {
      const fallbackAdmin = await prisma.user.findFirst({
        where: {
          OR: [
            { role: { name: { in: ['Admin', 'IT Admin', 'Administrator'] } } },
            { email: 'admin@company.com' },
          ],
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      effectiveUserId = fallbackAdmin?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id;
    }

    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Không thể xác định người tạo phiếu trong hệ thống' }, { status: 500 });
    }

    const { generateNextTicketNumber } = await import('@/lib/ticket-sequence');
    const { calculateBusinessSlaDeadline } = await import('@/lib/sla-escalation');
    const { routeTicket } = await import('@/lib/routing-engine');
    const { broadcastRealtimeEvent } = await import('@/lib/realtime');
    const { dispatchWebhookEvent } = await import('@/lib/webhooks');

    const currentYear = new Date().getFullYear();
    const ticketNumber = await generateNextTicketNumber(currentYear);

    const hoursMap: Record<string, number> = {
      URGENT: 4,
      HIGH: 8,
      MEDIUM: 24,
      LOW: 48,
    };
    const hours = hoursMap[priority] || 24;
    const is24x7 = priority === 'URGENT';
    const slaDeadline = calculateBusinessSlaDeadline(new Date(), hours, is24x7);

    const fullDescription = `${description ? description.trim() : title.trim()}\n\n---\n*Thông tin người báo sự cố qua tem QR:*\n- Người gửi: **${senderName.trim()}**\n- Liên hệ: **${senderContact.trim()}**\n- Thiết bị: **${asset.name} (${asset.assetTag})**\n- Serial: **${asset.serialNumber || '—'}**`;

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        title: `[Báo sự cố QR] ${title.trim()}`,
        description: fullDescription,
        category: 'HARDWARE',
        priority: priority as any,
        status: 'OPEN',
        assetId: asset.id,
        createdById: effectiveUserId,
        slaDeadline,
        attachmentUrls: Array.isArray(attachmentUrls) && attachmentUrls.length > 0 ? attachmentUrls : undefined,
      },
    });

    // Run auto-routing in background
    routeTicket(ticket.id).catch((e) => console.warn('[QR Scan Route Ticket Error]:', e));

    broadcastRealtimeEvent({
      type: 'TICKET_CREATED',
      title: `Sự cố mới từ mã QR: ${ticket.ticketNumber}`,
      message: `${ticket.title} (Thiết bị: ${asset.assetTag})`,
      data: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
      },
    });

    dispatchWebhookEvent('ticket.created', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      assetTag: asset.assetTag,
      source: 'QR_SCAN_PORTAL',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
      },
    });
  } catch (err: any) {
    console.error('Create ticket from scan error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi tạo yêu cầu hỗ trợ sự cố' }, { status: 500 });
  }
}
