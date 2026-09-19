import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canOnboard = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'users.create'));
    if (!canOnboard) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tiếp nhận nhân viên mới' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      fullName,
      email,
      position,
      department,
      companyName,
      phone,
      roleId,
      locationId,
      managerId,
      password = 'User@123',
      assignAssetIds = [],
      assignLicenseIds = [],
      handoverNotes = '',
    } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Họ tên và Email là thông tin bắt buộc' }, { status: 400 });
    }

    // Kiểm tra trùng email
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (existing) {
      return NextResponse.json({ error: `Email "${email}" đã tồn tại trong hệ thống` }, { status: 400 });
    }

    // Lấy roleId mặc định nếu chưa truyền
    let finalRoleId = roleId;
    if (!finalRoleId) {
      const userRole = await prisma.role.findFirst({
        where: { name: { in: ['USER', 'STAFF', 'EMPLOYEE'] } },
      });
      finalRoleId = userRole?.id;
      if (!finalRoleId) {
        const anyRole = await prisma.role.findFirst();
        finalRoleId = anyRole?.id;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Tạo nhân sự mới
    const newUser = await prisma.user.create({
      data: {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        position: position?.trim() || null,
        department: department?.trim() || null,
        companyName: companyName?.trim() || null,
        phone: phone?.trim() || null,
        roleId: finalRoleId,
        locationId: locationId || null,
        managerId: managerId || null,
        passwordHash,
        isActive: true,
      },
    });

    const now = new Date();
    const assignedAssetsDetails: any[] = [];
    const assignedLicensesDetails: any[] = [];

    // 2. Gán các thiết bị được chọn từ kho (AVAILABLE)
    if (Array.isArray(assignAssetIds) && assignAssetIds.length > 0) {
      for (const assetId of assignAssetIds) {
        const asset = await prisma.asset.findUnique({ where: { id: assetId } });
        if (asset) {
          await prisma.assetAssignment.create({
            data: {
              assetId,
              userId: newUser.id,
              assignedById: currentUser.userId,
              assignedAt: now,
              notes: handoverNotes
                ? `[Tiếp Nhận Nhân Sự Mới] ${handoverNotes}`
                : '[Tiếp Nhận Nhân Sự Mới] Cấp phát trang thiết bị làm việc ban đầu',
            },
          });

          await prisma.asset.update({
            where: { id: assetId },
            data: { status: 'IN_USE' },
          });

          assignedAssetsDetails.push({
            id: asset.id,
            assetTag: asset.assetTag,
            name: asset.name,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
            condition: asset.condition,
          });
        }
      }
    }

    // 3. Gán các bản quyền phần mềm được chọn
    if (Array.isArray(assignLicenseIds) && assignLicenseIds.length > 0) {
      for (const licId of assignLicenseIds) {
        const lic = await prisma.license.findUnique({ where: { id: licId } });
        if (lic) {
          await prisma.licenseAssignment.create({
            data: {
              licenseId: licId,
              userId: newUser.id,
              assignedById: currentUser.userId,
              assignedAt: now,
              notes: `[Tiếp Nhận Nhân Sự Mới] Cấp phát bản quyền phần mềm`,
            },
          });

          // Cập nhật usedSeats
          const currentCount = await prisma.licenseAssignment.count({
            where: { licenseId: licId, revokedAt: null },
          });
          await prisma.license.update({
            where: { id: licId },
            data: { usedSeats: currentCount },
          });

          assignedLicensesDetails.push({
            id: lic.id,
            name: lic.name,
            licenseType: lic.licenseType,
            licenseKey: lic.licenseKey,
          });
        }
      }
    }

    // 4. Ghi nhận Audit Log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'User',
        entityId: newUser.id,
        changes: {
          event: 'EMPLOYEE_ONBOARDED',
          userEmail: newUser.email,
          userFullName: newUser.fullName,
          assignedAssetsCount: assignedAssetsDetails.length,
          assignedLicensesCount: assignedLicensesDetails.length,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tiếp nhận nhân sự "${newUser.fullName}" thành công! Đã cấp phát ${assignedAssetsDetails.length} thiết bị và ${assignedLicensesDetails.length} bản quyền phần mềm.`,
      data: {
        user: newUser,
        assignedAssets: assignedAssetsDetails,
        assignedLicenses: assignedLicensesDetails,
        executor: {
          id: currentUser.userId,
          fullName: currentUser.name || currentUser.fullName || 'IT Admin',
        },
        onboardDate: now.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Onboard user error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi tiếp nhận nhân sự mới' }, { status: 500 });
  }
}
