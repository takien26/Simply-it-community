import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/assets/[id]/return - Return/Revoke an assigned asset
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
    const body = await request.json().catch(() => ({}));
    const { notes } = body;

    // Mark current active assignments as returned
    const activeAssignments = await prisma.assetAssignment.findMany({
      where: { assetId, returnedAt: null },
      include: { user: true },
    });

    if (activeAssignments.length === 0) {
      return NextResponse.json({ error: 'Tài sản hiện không được gán cho ai' }, { status: 400 });
    }

    await prisma.assetAssignment.updateMany({
      where: { assetId, returnedAt: null },
      data: {
        returnedAt: new Date(),
        notes: notes ? notes : undefined,
      },
    });

    // Update asset status back to AVAILABLE
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'AVAILABLE' },
    });

    await createAuditLog({
      action: 'REVOKE',
      entityType: 'Asset',
      entityId: assetId,
      userId: currentUser.userId,
      changes: {
        returnedFrom: activeAssignments.map((a) => a.user.fullName).join(', '),
        assetTag: updatedAsset.assetTag,
      },
    });

    return NextResponse.json({ success: true, message: 'Đã thu hồi tài sản về kho' });
  } catch (error) {
    console.error('Return asset error:', error);
    return NextResponse.json({ error: 'Thu hồi tài sản thất bại' }, { status: 500 });
  }
}
