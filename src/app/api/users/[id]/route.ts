import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users/[id] - Get user details with asset assignments
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        assetAssignments: {
          where: { returnedAt: null },
          include: { asset: true },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: { license: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Get user detail error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

// PUT /api/users/[id] - Update user details & Role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { fullName, email, department, position, companyName, phone, roleId, password, isActive, managerId, locationId, revokeAllAssignments } = body;

    const data: Record<string, unknown> = {};
    if (fullName) data.fullName = fullName;
    if (email) {
      const trimmedEmail = email.trim();
      const existing = await prisma.user.findFirst({
        where: { email: trimmedEmail, id: { not: id } },
      });
      if (existing) {
        return NextResponse.json({ error: `Email '${trimmedEmail}' đã được người dùng khác sử dụng` }, { status: 400 });
      }
      data.email = trimmedEmail;
    }
    if (department !== undefined) data.department = department || null;
    if (position !== undefined) data.position = position || null;
    if (companyName !== undefined) data.companyName = companyName || null;
    if (phone !== undefined) data.phone = phone || null;
    if (managerId !== undefined) data.managerId = managerId || null;
    if (locationId !== undefined) data.locationId = locationId || null;
    if (roleId) data.roleId = roleId;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    // If user is being marked as resigned/inactive and admin requested to revoke all assignments
    if (isActive === false && revokeAllAssignments) {
      const activeAssetAssignments = await prisma.assetAssignment.findMany({
        where: { userId: id, returnedAt: null },
      });

      if (activeAssetAssignments.length > 0) {
        await prisma.assetAssignment.updateMany({
          where: { userId: id, returnedAt: null },
          data: { returnedAt: new Date(), notes: 'Tự động thu hồi do nhân sự nghỉ việc' },
        });

        const assetIds = activeAssetAssignments.map((a) => a.assetId);
        await prisma.asset.updateMany({
          where: { id: { in: assetIds } },
          data: { status: 'AVAILABLE' },
        });
      }

      await prisma.licenseAssignment.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      include: {
        role: true,
        manager: { select: { id: true, fullName: true, email: true } },
        location: true,
      },
    });

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Update user failed' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Deactivate user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (id === currentUser.userId) {
      return NextResponse.json({ error: 'Không thể tự xóa tài khoản của chính mình' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Đã vô hiệu hóa tài khoản' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Delete user failed' }, { status: 500 });
  }
}
