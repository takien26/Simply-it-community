import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/assets/[id]/assign - Assign asset to a user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: assetId } = await params;
    const body = await request.json();
    const { userId, notes, assignedAt } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Vui lòng chọn nhân viên được gán' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'Không tìm thấy tài sản' }, { status: 404 });
    }

    // Close any previous active assignments if any
    await prisma.assetAssignment.updateMany({
      where: { assetId, returnedAt: null },
      data: { returnedAt: new Date() },
    });

    // Create new assignment
    const assignment = await prisma.assetAssignment.create({
      data: {
        assetId,
        userId,
        assignedById: currentUser.userId,
        assignedAt: assignedAt ? new Date(assignedAt) : new Date(),
        notes: notes || null,
      },
      include: {
        user: { select: { fullName: true, email: true } },
        asset: { select: { name: true, assetTag: true } },
      },
    });

    // Update asset status to IN_USE
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'IN_USE' },
    });

    await createAuditLog({
      action: 'ASSIGN',
      entityType: 'Asset',
      entityId: assetId,
      userId: currentUser.userId,
      changes: {
        assignedTo: assignment.user.fullName,
        assetTag: assignment.asset.assetTag,
      },
    });

    return NextResponse.json({ success: true, data: assignment });
  } catch (error) {
    console.error('Assign asset error:', error);
    return NextResponse.json({ error: 'Gán tài sản thất bại' }, { status: 500 });
  }
}
