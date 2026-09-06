import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { testRouting } from '@/lib/routing-engine';

// GET — List routing rules
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rules = await prisma.routingRule.findMany({
      include: {
        targetTeam: { select: { id: true, name: true, code: true } },
        targetUser: { select: { id: true, fullName: true, email: true, department: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ success: true, data: rules });
  } catch (error) {
    console.error('List routing rules error:', error);
    return NextResponse.json({ error: 'Failed to fetch routing rules' }, { status: 500 });
  }
}

// POST — Create routing rule or test routing
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // If test mode
    if (body.action === 'TEST') {
      const testResult = await testRouting(body.context || {});
      return NextResponse.json({ success: true, data: testResult });
    }

    const { name, description, priority, conditions, targetTeamId, targetQueueId, targetUserId, autoAssign, isActive } = body;

    if (!name || !targetTeamId || !conditions) {
      return NextResponse.json({ error: 'Tên rule, Team đích và điều kiện phân tuyến không được để trống' }, { status: 400 });
    }

    const rule = await prisma.routingRule.create({
      data: {
        name,
        description: description || null,
        priority: Number(priority) || 50,
        conditions: conditions,
        targetTeamId,
        targetQueueId: targetQueueId || null,
        targetUserId: targetUserId || null,
        autoAssign: !!autoAssign,
        isActive: isActive !== undefined ? !!isActive : true,
      },
      include: {
        targetTeam: { select: { id: true, name: true, code: true } },
        targetUser: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });

    return NextResponse.json({ success: true, data: rule }, { status: 201 });
  } catch (error) {
    console.error('Create routing rule error:', error);
    return NextResponse.json({ error: 'Failed to create routing rule' }, { status: 500 });
  }
}

// PUT — Update routing rule (via id in body)
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description, priority, conditions, targetTeamId, targetQueueId, targetUserId, autoAssign, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    const rule = await prisma.routingRule.update({
      where: { id },
      data: {
        name: name ?? undefined,
        description: description ?? undefined,
        priority: priority !== undefined ? Number(priority) : undefined,
        conditions: conditions ?? undefined,
        targetTeamId: targetTeamId ?? undefined,
        targetQueueId: targetQueueId !== undefined ? (targetQueueId || null) : undefined,
        targetUserId: targetUserId !== undefined ? (targetUserId || null) : undefined,
        autoAssign: autoAssign !== undefined ? !!autoAssign : undefined,
        isActive: isActive !== undefined ? !!isActive : undefined,
      },
      include: {
        targetTeam: { select: { id: true, name: true, code: true } },
        targetUser: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    console.error('Update routing rule error:', error);
    return NextResponse.json({ error: 'Failed to update routing rule' }, { status: 500 });
  }
}

// DELETE — Delete routing rule
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    await prisma.routingRule.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa Rule phân tuyến thành công' });
  } catch (error) {
    console.error('Delete routing rule error:', error);
    return NextResponse.json({ error: 'Failed to delete routing rule' }, { status: 500 });
  }
}
