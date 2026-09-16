import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/licenses/batch-merge
// Body: { targetMasterId: string, memberLicenseIds: string[] }
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'licenses.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { targetMasterId, memberLicenseIds } = body;

    if (!targetMasterId || typeof targetMasterId !== 'string') {
      return NextResponse.json({ error: 'Gói bản quyền chính không hợp lệ' }, { status: 400 });
    }

    if (!Array.isArray(memberLicenseIds) || memberLicenseIds.length === 0) {
      return NextResponse.json({ error: 'Danh sách gói cần gom không hợp lệ' }, { status: 400 });
    }

    // Verify master license exists
    const masterLicense = await prisma.license.findUnique({
      where: { id: targetMasterId },
      select: { id: true, name: true, totalSeats: true, usedSeats: true },
    });

    if (!masterLicense) {
      return NextResponse.json({ error: 'Không tìm thấy gói bản quyền chính' }, { status: 404 });
    }

    // Filter out targetMasterId from memberLicenseIds to avoid self-reference
    const childIdsToAttach = memberLicenseIds.filter((id: string) => id && id !== targetMasterId);

    if (childIdsToAttach.length === 0) {
      return NextResponse.json({ error: 'Không có gói con nào khác để gom vào gói chính' }, { status: 400 });
    }

    // Execute merge in transaction
    await prisma.$transaction(async (tx) => {
      // 1. If the master license itself was previously a child, remove its parentLicenseId so it is a true master
      await tx.license.update({
        where: { id: targetMasterId },
        data: { parentLicenseId: null },
      });

      // 2. Attach all child licenses to master
      await tx.license.updateMany({
        where: { id: { in: childIdsToAttach } },
        data: { parentLicenseId: targetMasterId },
      });

      // 3. Also if any of the child licenses had their own children, re-attach them to the new master
      await tx.license.updateMany({
        where: { parentLicenseId: { in: childIdsToAttach } },
        data: { parentLicenseId: targetMasterId },
      });
    });

    // Audit log
    await createAuditLog({
      userId: currentUser.userId,
      action: 'UPDATE',
      entityType: 'LICENSE',
      entityId: targetMasterId,
      changes: {
        event: 'BATCH_MERGE_LICENSES',
        masterLicenseName: masterLicense.name,
        mergedLicenseIds: childIdsToAttach,
        mergedCount: childIdsToAttach.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã gom thành công ${childIdsToAttach.length} gói vào ${masterLicense.name}`,
      data: {
        masterId: targetMasterId,
        mergedCount: childIdsToAttach.length,
      },
    });
  } catch (error) {
    console.error('Batch merge licenses error:', error);
    return NextResponse.json({ error: 'Lỗi khi gom nhóm các gói bản quyền' }, { status: 500 });
  }
}
