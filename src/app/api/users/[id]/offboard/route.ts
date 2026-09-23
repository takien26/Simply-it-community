import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  hasPermission,
  getRoleLevel,
  isSuperAdmin,
  isAdminOrAbove,
  canDeleteUser,
} from '@/lib/permissions';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (currentUser.userId === id) {
      return NextResponse.json({ error: 'Bạn không thể tự thực hiện thủ tục thôi việc cho chính mình' }, { status: 400 });
    }

    const canOffboard = isAdminOrAbove(currentUser.roleName) || (await hasPermission(currentUser.userId, 'users.delete'));
    if (!canOffboard) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền thực hiện thủ tục thôi việc cho nhân sự' }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        location: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const callerLevel = getRoleLevel(currentUser.roleName);
    const callerIsSuperAdmin = isSuperAdmin(currentUser.roleName);
    const targetLevel = getRoleLevel(targetUser.role?.name);

    if (!canDeleteUser(callerLevel, targetLevel, callerIsSuperAdmin)) {
      return NextResponse.json({
        error: `Forbidden: Bạn không thể thực hiện thủ tục thôi việc cho người có cấp bậc quyền hạn cao hơn hoặc ngang bằng bạn (Cấp của bạn: ${callerLevel}, Cấp đối tượng: ${targetLevel})`,
      }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const revokeAssetIds: string[] = Array.isArray(body.revokeAssetIds) ? body.revokeAssetIds : [];
    const revokeLicenseIds: string[] = Array.isArray(body.revokeLicenseIds) ? body.revokeLicenseIds : [];
    const transferTicketToUserId: string | null = body.transferTicketToUserId || null;
    const closeRemainingTickets: boolean = Boolean(body.closeRemainingTickets);
    const notes: string = body.notes || 'Thủ tục thôi việc / Chấm dứt hợp đồng lao động';

    const now = new Date();
    const revokedAssetsDetails: any[] = [];
    const revokedLicensesDetails: any[] = [];
    const transferredTicketsCount = { count: 0 };

    // 1. Thu hồi các tài sản được chọn (hoặc tất cả nếu không chỉ định rõ)
    const activeAssetAssignments = await prisma.assetAssignment.findMany({
      where: {
        userId: id,
        returnedAt: null,
        ...(revokeAssetIds.length > 0 ? { assetId: { in: revokeAssetIds } } : {}),
      },
      include: {
        asset: true,
      },
    });

    for (const asg of activeAssetAssignments) {
      await prisma.assetAssignment.update({
        where: { id: asg.id },
        data: {
          returnedAt: now,
          notes: `[Thu Hồi Nghỉ Việc] ${notes}`,
        },
      });

      await prisma.asset.update({
        where: { id: asg.assetId },
        data: {
          status: 'MAINTENANCE',
        },
      });

      // Tạo bản ghi bảo trì tự động: Yêu cầu kiểm tra & xóa sạch dữ liệu trước khi tái cấp
      try {
        await prisma.assetMaintenanceLog.create({
          data: {
            assetId: asg.assetId,
            type: 'INSPECTION',
            title: `Thu hồi sau thôi việc: Kiểm tra & Cài đặt lại OS (${targetUser.fullName})`,
            description: `Tài sản thu hồi từ nhân sự nghỉ việc (${targetUser.fullName} - ${targetUser.email}). Yêu cầu KTV kiểm tra phần cứng, sao lưu dữ liệu cần thiết, xóa sạch ổ cứng (sanitize) và cài lại hệ điều hành trước khi hoàn tất nhập kho sẵn sàng cấp phát.`,
            performedAt: now,
            performedById: currentUser.userId,
            notes: notes || undefined,
          },
        });
      } catch (logErr) {
        console.error('Failed to create AssetMaintenanceLog on offboard:', logErr);
      }

      revokedAssetsDetails.push({
        id: asg.asset.id,
        assetTag: asg.asset.assetTag,
        name: asg.asset.name,
        brand: asg.asset.brand,
        model: asg.asset.model,
        serialNumber: asg.asset.serialNumber,
        condition: asg.asset.condition,
      });
    }

    // 2. Thu hồi các bản quyền phần mềm được chọn (hoặc tất cả)
    const activeLicenseAssignments = await prisma.licenseAssignment.findMany({
      where: {
        userId: id,
        revokedAt: null,
        ...(revokeLicenseIds.length > 0 ? { licenseId: { in: revokeLicenseIds } } : {}),
      },
      include: {
        license: true,
      },
    });

    const affectedLicenseIds = new Set<string>();

    for (const lasg of activeLicenseAssignments) {
      await prisma.licenseAssignment.update({
        where: { id: lasg.id },
        data: {
          revokedAt: now,
          notes: `[Thu Hồi Nghỉ Việc] ${notes}`,
        },
      });

      affectedLicenseIds.add(lasg.licenseId);
      revokedLicensesDetails.push({
        id: lasg.license.id,
        name: lasg.license.name,
        licenseType: lasg.license.licenseType,
        licenseKey: lasg.license.licenseKey,
      });
    }

    // Cập nhật lại số ghế usedSeats cho các license bị ảnh hưởng
    for (const licId of affectedLicenseIds) {
      const activeCount = await prisma.licenseAssignment.count({
        where: { licenseId: licId, revokedAt: null },
      });
      await prisma.license.update({
        where: { id: licId },
        data: { usedSeats: activeCount },
      });
    }

    // 3. Xử lý các ticket đang mở
    const openTickets = await prisma.ticket.findMany({
      where: {
        assignedToId: id,
        status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
      },
    });

    if (openTickets.length > 0) {
      if (transferTicketToUserId) {
        for (const t of openTickets) {
          await prisma.ticket.update({
            where: { id: t.id },
            data: {
              assignedToId: transferTicketToUserId,
              reassignmentCount: { increment: 1 },
              overrideReason: `Chuyển giao do nhân sự ${targetUser.fullName} nghỉ việc`,
            },
          });
          await prisma.ticketComment.create({
            data: {
              ticketId: t.id,
              userId: currentUser.userId,
              content: `🔄 [Hệ thống] Chuyển giao phụ trách ticket sang cho kỹ thuật viên mới do nhân sự ${targetUser.fullName} đã nghỉ việc.`,
              isInternal: true,
            },
          });
          transferredTicketsCount.count++;
        }
      } else if (closeRemainingTickets) {
        for (const t of openTickets) {
          await prisma.ticket.update({
            where: { id: t.id },
            data: {
              status: 'RESOLVED',
              resolvedAt: now,
              resolutionNotes: `Đóng ticket tự động do nhân sự phụ trách (${targetUser.fullName}) nghỉ việc.`,
            },
          });
          transferredTicketsCount.count++;
        }
      }
    }

    // 4. Khóa tài khoản người dùng
    await prisma.user.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    // 5. Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'UPDATE',
        entityType: 'User',
        entityId: id,
        changes: {
          event: 'EMPLOYEE_OFFBOARDED',
          deactivated: true,
          revokedAssetsCount: revokedAssetsDetails.length,
          revokedLicensesCount: revokedLicensesDetails.length,
          transferredTicketsCount: transferredTicketsCount.count,
          notes,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Đã hoàn tất thủ tục nghỉ việc cho "${targetUser.fullName}": Thu hồi ${revokedAssetsDetails.length} thiết bị, giải phóng ${revokedLicensesDetails.length} license, khóa tài khoản thành công!`,
      summary: {
        user: {
          id: targetUser.id,
          fullName: targetUser.fullName,
          email: targetUser.email,
          department: targetUser.department,
          position: targetUser.position,
          companyName: targetUser.companyName,
        },
        executor: {
          id: currentUser.userId,
          fullName: currentUser.name || currentUser.fullName || 'IT Admin',
        },
        offboardDate: now.toISOString(),
        notes,
        revokedAssets: revokedAssetsDetails,
        revokedLicenses: revokedLicensesDetails,
        transferredTicketsCount: transferredTicketsCount.count,
      },
    });
  } catch (error: any) {
    console.error('Execute offboard error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi thực thi thủ tục thôi việc' }, { status: 500 });
  }
}
