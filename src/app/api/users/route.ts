import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users - List users/staff with their assigned assets & licenses
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const department = searchParams.get('department');

    const where: Record<string, unknown> = { isActive: true };

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (department) where.department = department;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        position: true,
        companyName: true,
        phone: true,
        managerId: true,
        manager: { select: { id: true, fullName: true, email: true } },
        locationId: true,
        location: { select: { id: true, name: true, building: true, floor: true } },
        role: { select: { id: true, name: true } },
        assetAssignments: {
          where: { returnedAt: null },
          include: {
            asset: {
              select: {
                id: true,
                assetTag: true,
                name: true,
                status: true,
                category: { select: { name: true, icon: true } },
              },
            },
          },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: {
            license: {
              select: {
                id: true,
                name: true,
                licenseType: true,
                expiryDate: true,
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error('List users error:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}

// POST /api/users - Create new staff member
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreateUser = await hasPermission(currentUser.userId, 'users.create');
    if (!canCreateUser) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo tài khoản người dùng' }, { status: 403 });
    }

    const body = await request.json();
    const { fullName, email, password, department, position, companyName, phone, roleId, managerId, locationId } = body;

    if (!fullName || !email) {
      return NextResponse.json({ error: 'Họ tên và email là bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: `Email '${email}' đã được sử dụng` }, { status: 400 });
    }

    // Default role: Staff if not provided
    let targetRoleId = roleId;
    if (!targetRoleId) {
      const staffRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
      targetRoleId = staffRole?.id;
    }

    if (!targetRoleId) {
      const anyRole = await prisma.role.findFirst();
      targetRoleId = anyRole?.id;
    }

    const hashedPassword = await bcrypt.hash(password || 'Staff@123', 10);

    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        passwordHash: hashedPassword,
        department: department || null,
        position: position || null,
        companyName: companyName || null,
        phone: phone || null,
        managerId: managerId || null,
        locationId: locationId || null,
        roleId: targetRoleId,
        isActive: true,
      },
      include: {
        role: true,
        manager: { select: { id: true, fullName: true, email: true } },
        location: true,
      },
    });

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Create user failed' }, { status: 500 });
  }
}
