import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — List all support queues
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    const where: any = { isActive: true };
    if (teamId) where.teamId = teamId;

    const queues = await prisma.supportQueue.findMany({
      where,
      include: {
        team: { select: { id: true, name: true, code: true } },
        _count: {
          select: {
            tickets: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } },
            },
          },
        },
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });

    const formatted = queues.map((q) => ({
      ...q,
      activeTicketCount: q._count.tickets,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error) {
    console.error('List support queues error:', error);
    return NextResponse.json({ error: 'Failed to fetch queues' }, { status: 500 });
  }
}

// POST — Create support queue
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, teamId, description, isDefault } = body;

    if (!name || !code || !teamId) {
      return NextResponse.json({ error: 'Tên queue, mã code và Team ID không được để trống' }, { status: 400 });
    }

    const existing = await prisma.supportQueue.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: `Mã queue "${code}" đã tồn tại` }, { status: 400 });
    }

    // If marked as default, unset other defaults across all queues or team
    if (isDefault) {
      await prisma.supportQueue.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const queue = await prisma.supportQueue.create({
      data: {
        name,
        code: code.toUpperCase(),
        teamId,
        description: description || null,
        isDefault: !!isDefault,
        isActive: true,
      },
      include: {
        team: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, data: queue }, { status: 201 });
  } catch (error) {
    console.error('Create support queue error:', error);
    return NextResponse.json({ error: 'Failed to create queue' }, { status: 500 });
  }
}

// PUT — Update support queue
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, code, teamId, description, isDefault, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.supportQueue.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (teamId !== undefined) updateData.teamId = teamId;
    if (description !== undefined) updateData.description = description;
    if (isDefault !== undefined) updateData.isDefault = !!isDefault;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const queue = await prisma.supportQueue.update({
      where: { id },
      data: updateData,
      include: {
        team: { select: { id: true, name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, data: queue });
  } catch (error) {
    console.error('Update support queue error:', error);
    return NextResponse.json({ error: 'Failed to update queue' }, { status: 500 });
  }
}

// DELETE — Delete or deactivate support queue
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Queue ID is required' }, { status: 400 });
    }

    const queue = await prisma.supportQueue.findUnique({ where: { id } });
    if (queue?.isDefault) {
      return NextResponse.json({ error: 'Không thể xóa Fallback Queue mặc định của hệ thống' }, { status: 400 });
    }

    await prisma.supportQueue.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Queue deleted successfully' });
  } catch (error) {
    console.error('Delete support queue error:', error);
    return NextResponse.json({ error: 'Failed to delete queue' }, { status: 500 });
  }
}
