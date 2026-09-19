import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import {
  calculateNextRunDate,
  parseScheduleConfig,
  encodeScheduleConfig,
  ScheduleConfig,
} from '@/lib/maintenance-cron';

// GET /api/maintenance-schedules
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawSchedules = await prisma.maintenanceSchedule.findMany({
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
        assignTo: { select: { id: true, fullName: true, email: true, department: true } },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    const schedules = rawSchedules.map((s) => {
      const { cleanDesc, config } = parseScheduleConfig(s.description);
      return {
        ...s,
        cleanDescription: cleanDesc,
        scheduleConfig: config,
      };
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

    const canCreate = user.roleName === 'Admin' || (await hasPermission(user.userId, 'assets.maintenance.create'));
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo lịch bảo trì' }, { status: 403 });
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
      scheduleConfig,
    } = body;

    if (!name || !frequency || !maintenanceType) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const finalDescription = encodeScheduleConfig(description || '', scheduleConfig);
    const startDate = nextRunAt
      ? new Date(nextRunAt)
      : calculateNextRunDate(new Date(), frequency, scheduleConfig);

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        name,
        description: finalDescription || null,
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
        category: { select: { id: true, name: true, icon: true } },
        assignTo: { select: { id: true, fullName: true, email: true } },
      },
    });

    const { cleanDesc, config } = parseScheduleConfig(schedule.description);
    return NextResponse.json(
      {
        success: true,
        schedule: {
          ...schedule,
          cleanDescription: cleanDesc,
          scheduleConfig: config,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
