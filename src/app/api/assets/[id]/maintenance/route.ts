import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MaintenanceType } from '@prisma/client';

// GET /api/assets/[id]/maintenance
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const logs = await prisma.assetMaintenanceLog.findMany({
      where: { assetId: id },
      include: {
        performedBy: { select: { id: true, fullName: true, email: true } },
        vendor: { select: { id: true, name: true } },
      },
      orderBy: { performedAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('List maintenance error:', error);
    return NextResponse.json({ error: 'Failed to fetch maintenance logs' }, { status: 500 });
  }
}

// POST /api/assets/[id]/maintenance
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, title, description, cost, performedAt, performedById, vendorId, notes } = body;

    if (!title || !type) {
      return NextResponse.json({ error: 'Tiêu đề và loại hoạt động là bắt buộc' }, { status: 400 });
    }

    const log = await prisma.assetMaintenanceLog.create({
      data: {
        assetId: id,
        type: type as MaintenanceType,
        title,
        description: description || null,
        cost: cost !== undefined && cost !== '' && !isNaN(Number(cost)) ? Number(cost) : null,
        performedAt: performedAt ? new Date(performedAt) : new Date(),
        performedById: performedById || currentUser.userId,
        vendorId: vendorId || null,
        notes: notes || null,
      },
      include: {
        performedBy: { select: { fullName: true, email: true } },
        vendor: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, data: log }, { status: 201 });
  } catch (error) {
    console.error('Create maintenance error:', error);
    return NextResponse.json({ error: 'Failed to create maintenance log' }, { status: 500 });
  }
}

// DELETE /api/assets/[id]/maintenance?logId=...
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const logId = searchParams.get('logId');
    if (!logId) {
      return NextResponse.json({ error: 'logId is required' }, { status: 400 });
    }

    await prisma.assetMaintenanceLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi sửa chữa / nâng cấp' });
  } catch (error) {
    console.error('Delete maintenance error:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance log' }, { status: 500 });
  }
}
