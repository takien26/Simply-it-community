import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

// GET /api/webhooks
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = await hasPermission(user.userId, 'settings.view');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xem cấu hình Webhook' }, { status: 403 });
    }

    const webhooks = await prisma.webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, webhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/webhooks
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(user.userId, 'settings.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền cấu hình Webhook' }, { status: 403 });
    }

    const body = await request.json();
    const { name, provider, webhookUrl, events, isActive } = body;

    if (!name || !webhookUrl) {
      return NextResponse.json({ error: 'Tên và Webhook URL không được để trống' }, { status: 400 });
    }

    const webhook = await prisma.webhookConfig.create({
      data: {
        name,
        provider: provider || 'custom',
        webhookUrl,
        events: events || ['ticket.created', 'ticket.urgent'],
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, webhook }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/webhooks
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(user.userId, 'settings.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền cấu hình Webhook' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, provider, webhookUrl, events, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    const updated = await prisma.webhookConfig.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(provider && { provider }),
        ...(webhookUrl && { webhookUrl }),
        ...(events && { events }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, webhook: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/webhooks
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing ID' }, { status: 400 });
    }

    await prisma.webhookConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
