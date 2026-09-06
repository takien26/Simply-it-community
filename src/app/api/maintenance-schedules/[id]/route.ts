import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    } = body;

    const updated = await prisma.maintenanceSchedule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(frequency && { frequency }),
        ...(maintenanceType && { maintenanceType }),
        ...(assetId !== undefined && { assetId: assetId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(nextRunAt && { nextRunAt: new Date(nextRunAt) }),
        ...(ticketPriority && { ticketPriority }),
        ...(assignToId !== undefined && { assignToId: assignToId || null }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(autoCreateTicket !== undefined && { autoCreateTicket: Boolean(autoCreateTicket) }),
      },
    });

    return NextResponse.json({ success: true, schedule: updated });
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

    const { id } = await params;
    await prisma.maintenanceSchedule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
