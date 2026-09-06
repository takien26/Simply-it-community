import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/licenses/[id]/revoke - Revoke an assigned seat
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: licenseId } = await params;
    const body = await request.json();
    const { assignmentId, userId, assetId } = body;

    const whereClause: Record<string, unknown> = {
      licenseId,
      revokedAt: null,
    };

    if (assignmentId) whereClause.id = assignmentId;
    if (userId) whereClause.userId = userId;
    if (assetId) whereClause.assetId = assetId;

    const activeAssignments = await prisma.licenseAssignment.findMany({
      where: whereClause,
      include: { user: true, license: true },
    });

    if (activeAssignments.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy lượt gán active nào' }, { status: 400 });
    }

    await prisma.licenseAssignment.updateMany({
      where: whereClause,
      data: { revokedAt: new Date() },
    });

    // Recalculate used seats
    const currentActiveCount = await prisma.licenseAssignment.count({
      where: { licenseId, revokedAt: null },
    });

    await prisma.license.update({
      where: { id: licenseId },
      data: { usedSeats: currentActiveCount },
    });

    await createAuditLog({
      action: 'REVOKE',
      entityType: 'License',
      entityId: licenseId,
      userId: currentUser.userId,
      changes: {
        revokedFrom: activeAssignments.map((a) => a.user?.fullName).join(', '),
      },
    });

    return NextResponse.json({ success: true, message: 'Đã thu hồi license' });
  } catch (error) {
    console.error('Revoke license error:', error);
    return NextResponse.json({ error: 'Thu hồi license thất bại' }, { status: 500 });
  }
}
