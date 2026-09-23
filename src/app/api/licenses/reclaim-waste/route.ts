import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

const DECOMMISSIONED_ASSET_STATUSES = ['MAINTENANCE', 'RETIRED', 'LOST'];

// GET /api/licenses/reclaim-waste — Quét và liệt kê toàn bộ các ghế bản quyền đang bị lãng phí
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const assignments = await prisma.licenseAssignment.findMany({
      where: {
        revokedAt: null,
        OR: [
          { user: { isActive: false } },
          { asset: { status: { in: DECOMMISSIONED_ASSET_STATUSES as any } } },
        ],
      },
      include: {
        license: {
          select: {
            id: true,
            name: true,
            licenseKey: true,
            totalSeats: true,
            usedSeats: true,
            purchasePrice: true,
            purchaseCurrency: true,
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
            isActive: true,
          },
        },
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const items = assignments.map((a) => {
      let wasteReason = '';
      if (a.user && !a.user.isActive) {
        wasteReason = 'Nhân viên đã thôi việc / tài khoản bị vô hiệu hóa';
      } else if (a.asset && DECOMMISSIONED_ASSET_STATUSES.includes(a.asset.status)) {
        wasteReason = `Thiết bị đang bảo trì hoặc đã thanh lý/mất (${a.asset.status})`;
      } else {
        wasteReason = 'Không hoạt động';
      }

      return {
        id: a.id,
        licenseId: a.licenseId,
        licenseName: a.license.name,
        assignedAt: a.assignedAt,
        wasteReason,
        user: a.user,
        asset: a.asset,
      };
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error: any) {
    console.error('Error fetching wasted license seats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST /api/licenses/reclaim-waste — Thu hồi 1-chạm hoặc hàng loạt ghế bản quyền lãng phí
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await hasPermission(currentUser.userId, 'licenses.assign');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let targetIds: string[] = [];
    try {
      const body = await request.json();
      if (Array.isArray(body?.assignmentIds) && body.assignmentIds.length > 0) {
        targetIds = body.assignmentIds;
      }
    } catch {}

    // Nếu không truyền ID cụ thể, lấy tất cả các ghế lãng phí hiện tại
    if (targetIds.length === 0) {
      const allWasted = await prisma.licenseAssignment.findMany({
        where: {
          revokedAt: null,
          OR: [
            { user: { isActive: false } },
            { asset: { status: { in: DECOMMISSIONED_ASSET_STATUSES as any } } },
          ],
        },
        select: { id: true },
      });
      targetIds = allWasted.map((a) => a.id);
    }

    if (targetIds.length === 0) {
      return NextResponse.json({ success: true, reclaimedCount: 0, message: 'Không có ghế lãng phí nào cần thu hồi' });
    }

    // Tiến hành thu hồi
    const now = new Date();
    await prisma.licenseAssignment.updateMany({
      where: { id: { in: targetIds } },
      data: {
        revokedAt: now,
        notes: '[Tự động thu hồi do người dùng ngừng hoạt động / thiết bị ngừng sử dụng]',
      },
    });

    // Cập nhật lại usedSeats cho các license liên quan
    const affectedAssignments = await prisma.licenseAssignment.findMany({
      where: { id: { in: targetIds } },
      select: { licenseId: true },
    });
    const uniqueLicenseIds = Array.from(new Set(affectedAssignments.map((a) => a.licenseId)));

    for (const licId of uniqueLicenseIds) {
      const activeCount = await prisma.licenseAssignment.count({
        where: { licenseId: licId, revokedAt: null },
      });
      await prisma.license.update({
        where: { id: licId },
        data: { usedSeats: activeCount },
      });
    }

    // Ghi Audit Log
    await createAuditLog({
      action: 'UPDATE',
      entityType: 'LicenseAssignment',
      entityId: uniqueLicenseIds[0] || 'BULK_RECLAIM',
      userId: currentUser.userId,
      changes: {
        action: 'RECLAIM_WASTED_SEATS',
        reclaimedCount: targetIds.length,
        affectedLicenses: uniqueLicenseIds,
      },
    });

    return NextResponse.json({
      success: true,
      reclaimedCount: targetIds.length,
      affectedLicensesCount: uniqueLicenseIds.length,
    });
  } catch (error: any) {
    console.error('Error reclaiming wasted license seats:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
