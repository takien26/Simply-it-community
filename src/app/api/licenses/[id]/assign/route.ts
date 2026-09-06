import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/licenses/[id]/assign - Assign seats to one or multiple users/assets/pairs
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
    const { userId, assetId, userIds, assetIds, pairs, notes } = body;

    // Build unified target list of { userId, assetId }
    let targets: Array<{ userId?: string | null; assetId?: string | null }> = [];

    if (Array.isArray(pairs) && pairs.length > 0) {
      targets = pairs.map((p: any) => ({
        userId: p.userId || null,
        assetId: p.assetId || null,
      }));
    } else {
      // Legacy separate arrays support
      const targetUserIds: string[] = Array.isArray(userIds) ? userIds : userId ? [userId] : [];
      const targetAssetIds: string[] = Array.isArray(assetIds) ? assetIds : assetId ? [assetId] : [];

      for (const uid of targetUserIds) {
        targets.push({ userId: uid, assetId: null });
      }
      for (const aid of targetAssetIds) {
        targets.push({ userId: null, assetId: aid });
      }
    }

    // Filter out invalid items
    targets = targets.filter((t) => t.userId || t.assetId);

    if (targets.length === 0) {
      return NextResponse.json(
        { error: 'Vui lòng chọn ít nhất một nhân sự hoặc máy tính để gán license' },
        { status: 400 }
      );
    }

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        assignments: { where: { revokedAt: null } },
      },
    });

    if (!license) {
      return NextResponse.json({ error: 'Không tìm thấy license' }, { status: 404 });
    }

    const availableSeats = Math.max(0, license.totalSeats - license.assignments.length);
    const isOverAllocated = targets.length > availableSeats;

    const createdAssignments = [];

    for (const target of targets) {
      // If assetId is provided but no userId, try to lookup who is currently using this asset
      let finalUserId = target.userId;
      if (!finalUserId && target.assetId) {
        const activeAssetAssignment = await prisma.assetAssignment.findFirst({
          where: { assetId: target.assetId, returnedAt: null },
          select: { userId: true },
        });
        if (activeAssetAssignment) {
          finalUserId = activeAssetAssignment.userId;
        }
      }

      // Check if this specific asset or user-only assignment already exists actively
      let isAlreadyAssigned = false;
      if (target.assetId) {
        const existingAsset = await prisma.licenseAssignment.findFirst({
          where: {
            licenseId,
            assetId: target.assetId,
            revokedAt: null,
          },
        });
        if (existingAsset) isAlreadyAssigned = true;
      } else if (finalUserId) {
        const existingUserOnly = await prisma.licenseAssignment.findFirst({
          where: {
            licenseId,
            userId: finalUserId,
            assetId: null,
            revokedAt: null,
          },
        });
        if (existingUserOnly) isAlreadyAssigned = true;
      }

      if (!isAlreadyAssigned) {
        const a = await prisma.licenseAssignment.create({
          data: {
            licenseId,
            userId: finalUserId || null,
            assetId: target.assetId || null,
            assignedById: currentUser.userId,
            notes: notes || null,
          },
          include: {
            user: { select: { id: true, fullName: true, department: true } },
            asset: { select: { id: true, assetTag: true, name: true } },
          },
        });
        createdAssignments.push(a);
      }
    }

    // Recalculate and update total used seats
    const newUsedCount = await prisma.licenseAssignment.count({
      where: { licenseId, revokedAt: null },
    });

    await prisma.license.update({
      where: { id: licenseId },
      data: { usedSeats: newUsedCount },
    });

    await createAuditLog({
      action: 'ASSIGN',
      entityType: 'License',
      entityId: licenseId,
      userId: currentUser.userId,
      changes: {
        licenseName: license.name,
        assignedCount: createdAssignments.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: createdAssignments,
      message: `Đã cấp phát thành công ${createdAssignments.length} seats cho nhân sự / máy tính`,
    });
  } catch (error) {
    console.error('Assign license error:', error);
    return NextResponse.json({ error: 'Cấp phát license thất bại' }, { status: 500 });
  }
}
