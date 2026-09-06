import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

// GET /api/roles - List all roles with their permissions
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [roles, allPermissions] = await Promise.all([
      prisma.role.findMany({
        include: {
          permissions: {
            include: { permission: true },
          },
          _count: { select: { users: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.permission.findMany({
        orderBy: [{ module: 'asc' }, { code: 'asc' }],
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        roles: roles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
          isSystem: r.isSystem,
          userCount: r._count.users,
          permissionCodes: r.permissions.map((p) => p.permission.code),
        })),
        allPermissions,
      },
    });
  } catch (error) {
    console.error('List roles error:', error);
    return NextResponse.json({ error: 'Failed to list roles' }, { status: 500 });
  }
}

// POST /api/roles - Create or update a role with permissions
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageRoles = await hasPermission(currentUser.userId, 'users.permissions');
    if (!canManageRoles) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền quản lý vai trò và phân quyền' }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, description, permissionCodes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên vai trò là bắt buộc' }, { status: 400 });
    }

    let role;
    if (id) {
      // Update existing role
      role = await prisma.role.update({
        where: { id },
        data: { name, description: description || null },
      });
    } else {
      // Create new role
      role = await prisma.role.create({
        data: { name, description: description || null, isSystem: false },
      });
    }

    // Update permissions if provided
    if (Array.isArray(permissionCodes)) {
      // Delete old role permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

      // Find permission IDs for given codes
      const targetPerms = await prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });

      for (const p of targetPerms) {
        await prisma.rolePermission.create({
          data: { roleId: role.id, permissionId: p.id },
        });
      }
    }

    return NextResponse.json({ success: true, data: role });
  } catch (error) {
    console.error('Save role error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to save role' }, { status: 500 });
  }
}


// DELETE /api/roles - Delete custom role
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManageRoles = await hasPermission(currentUser.userId, 'users.permissions');
    if (!canManageRoles) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa vai trò' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID vai trò là bắt buộc' }, { status: 400 });
    }

    const role = await prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });

    if (!role) {
      return NextResponse.json({ error: 'Không tìm thấy vai trò' }, { status: 404 });
    }

    if (role.isSystem) {
      return NextResponse.json({ error: 'Không thể xóa vai trò mặc định của hệ thống' }, { status: 400 });
    }

    if (role._count.users > 0) {
      return NextResponse.json({
        error: `Không thể xóa vai trò này vì đang có ${role._count.users} người dùng đang được gán.`,
      }, { status: 400 });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: id } });
    await prisma.role.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa vai trò thành công' });
  } catch (error) {
    console.error('Delete role error:', error);
    return NextResponse.json({ error: 'Xóa vai trò thất bại' }, { status: 500 });
  }
}
