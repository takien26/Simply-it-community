import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = currentUser.roleName === 'Admin' ||
      (await hasPermission(currentUser.userId, 'users.update')) ||
      (await hasPermission(currentUser.userId, 'users.delete'));
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền truy cập thông tin thu hồi / offboard nhân sự' }, { status: 403 });
    }

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        location: true,
        assetAssignments: {
          where: { returnedAt: null },
          include: {
            asset: {
              include: {
                category: { select: { id: true, name: true, icon: true } },
                location: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: {
            license: {
              select: {
                id: true,
                name: true,
                licenseType: true,
                licenseKey: true,
                companyName: true,
                expiryDate: true,
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
        assignedTickets: {
          where: {
            status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] },
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Không tìm thấy nhân sự' }, { status: 404 });
    }

    // Danh sách ứng viên để chuyển giao ticket (Các thành viên IT khác)
    const itStaff = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: id },
        OR: [
          { role: { name: { in: ['ADMIN', 'SUPER_ADMIN', 'TECHNICIAN'] } } },
          { department: { contains: 'IT', mode: 'insensitive' } },
          { department: { contains: 'CNTT', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        position: true,
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          position: user.position,
          department: user.department,
          companyName: user.companyName,
          phone: user.phone,
          isActive: user.isActive,
          locationName: user.location?.name,
        },
        assets: user.assetAssignments.map((a) => ({
          assignmentId: a.id,
          assignedAt: a.assignedAt,
          id: a.asset.id,
          assetTag: a.asset.assetTag,
          name: a.asset.name,
          brand: a.asset.brand,
          model: a.asset.model,
          serialNumber: a.asset.serialNumber,
          categoryName: a.asset.category?.name,
          categoryIcon: a.asset.category?.icon,
          condition: a.asset.condition,
          companyName: a.asset.companyName,
        })),
        licenses: user.licenseAssignments.map((la) => ({
          assignmentId: la.id,
          assignedAt: la.assignedAt,
          id: la.license.id,
          name: la.license.name,
          licenseType: la.license.licenseType,
          companyName: la.license.companyName,
          expiryDate: la.license.expiryDate,
        })),
        tickets: user.assignedTickets,
        itStaff,
      },
    });
  } catch (error: any) {
    console.error('Fetch offboard preview error:', error);
    return NextResponse.json({ error: error?.message || 'Lỗi kiểm tra thông tin nghỉ việc' }, { status: 500 });
  }
}
