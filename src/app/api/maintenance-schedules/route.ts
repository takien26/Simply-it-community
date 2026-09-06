import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { calculateNextRunDate } from '@/lib/maintenance-cron';

// GET /api/maintenance-schedules
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        category: { select: { id: true, name: true } },
        assignTo: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    return NextResponse.json({ success: true, schedules });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/maintenance-schedules
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      frequency,
      maintenanceType,
      assetId,
      categoryId,
      nextRunAt,
      ticketPriority,
      assignToId,
      autoCreateTicket,
    } = body;

    if (!name || !frequency || !maintenanceType) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const startDate = nextRunAt ? new Date(nextRunAt) : calculateNextRunDate(new Date(), frequency);

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        name,
        description: description || null,
        frequency,
        maintenanceType,
        assetId: assetId || null,
        categoryId: categoryId || null,
        nextRunAt: startDate,
        ticketPriority: ticketPriority || 'MEDIUM',
        assignToId: assignToId || null,
        autoCreateTicket: autoCreateTicket !== undefined ? Boolean(autoCreateTicket) : true,
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        category: { select: { id: true, name: true } },
        assignTo: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
