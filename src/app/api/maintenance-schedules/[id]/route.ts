import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';
import {
  parseScheduleConfig,
  encodeScheduleConfig,
  calculateNextRunDate,
} from '@/lib/maintenance-cron';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.maintenance.update'));
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền sửa lịch bảo trì' }, { status: 403 });
    }

    const { id } = await params;
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
      isActive,
      autoCreateTicket,
      scheduleConfig,
    } = body;

    // If description or scheduleConfig are provided, merge them properly
    let finalDescription: string | undefined = undefined;
    if (description !== undefined || scheduleConfig !== undefined) {
      const existing = await prisma.maintenanceSchedule.findUnique({
        where: { id },
        select: { description: true, frequency: true },
      });
      const existingParsed = parseScheduleConfig(existing?.description);
      const cleanDesc = description !== undefined ? description : existingParsed.cleanDesc;
      const finalConfig = scheduleConfig !== undefined ? scheduleConfig : existingParsed.config;
      finalDescription = encodeScheduleConfig(cleanDesc, finalConfig);
    }

    let calculatedNextRunAt: Date | undefined = undefined;
    if (nextRunAt) {
      calculatedNextRunAt = new Date(nextRunAt);
    }

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(finalDescription !== undefined && { description: finalDescription }),
        ...(frequency && { frequency }),
        ...(maintenanceType && { maintenanceType }),
        ...(assetId !== undefined && { assetId: assetId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(calculatedNextRunAt && { nextRunAt: calculatedNextRunAt }),
        ...(ticketPriority && { ticketPriority }),
        ...(assignToId !== undefined && { assignToId: assignToId || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(autoCreateTicket !== undefined && { autoCreateTicket: Boolean(autoCreateTicket) }),
      },
      include: {
        asset: { select: { id: true, assetTag: true, name: true } },
        category: { select: { id: true, name: true, icon: true } },
        assignTo: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });

    const { cleanDesc, config } = parseScheduleConfig(updated.description);

    return NextResponse.json({
      success: true,
      schedule: {
        ...updated,
        cleanDescription: cleanDesc,
        scheduleConfig: config,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.maintenance.delete'));
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa lịch bảo trì' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.maintenanceSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
