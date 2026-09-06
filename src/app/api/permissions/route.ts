import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/permissions - List all permissions grouped by module
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { code: 'asc' }],
    });

    const modules = Array.from(new Set(permissions.map((p) => p.module))).sort();

    return NextResponse.json({
      success: true,
      data: {
        permissions,
        modules,
      },
    });
  } catch (error) {
    console.error('List permissions error:', error);
    return NextResponse.json({ error: 'Failed to list permissions' }, { status: 500 });
  }
}

// POST /api/permissions - Create a new custom permission
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, name, module, description } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Mã quyền (code) là bắt buộc' }, { status: 400 });
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên quyền (name) là bắt buộc' }, { status: 400 });
    }

    const cleanCode = code.trim().toLowerCase().replace(/\s+/g, '.');
    const cleanModule = (module && module.trim()) ? module.trim().toLowerCase() : 'other';

    // Check if code already exists
    const existing = await prisma.permission.findUnique({ where: { code: cleanCode } });
    if (existing) {
      return NextResponse.json({ error: `Mã quyền "${cleanCode}" đã tồn tại trong hệ thống` }, { status: 400 });
    }

    const permission = await prisma.permission.create({
      data: {
        code: cleanCode,
        name: name.trim(),
        module: cleanModule,
        description: description ? description.trim() : null,
      },
    });

    // Automatically grant to Admin role
    const adminRole = await prisma.role.findFirst({ where: { name: { in: ['Admin', 'admin', 'Quản trị viên'] } } });
    if (adminRole) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: permission.id },
      });
    }

    return NextResponse.json({ success: true, data: permission }, { status: 201 });
  } catch (error) {
    console.error('Create permission error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tạo quyền thất bại' }, { status: 500 });
  }
}

// PUT /api/permissions - Update an existing permission
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, code, name, module, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID quyền là bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy quyền này' }, { status: 404 });
    }

    let cleanCode = existing.code;
    if (code && code.trim()) {
      cleanCode = code.trim().toLowerCase().replace(/\s+/g, '.');
      if (cleanCode !== existing.code) {
        const duplicate = await prisma.permission.findUnique({ where: { code: cleanCode } });
        if (duplicate) {
          return NextResponse.json({ error: `Mã quyền "${cleanCode}" đã tồn tại` }, { status: 400 });
        }
      }
    }

    const updated = await prisma.permission.update({
      where: { id },
      data: {
        code: cleanCode,
        name: name !== undefined ? name.trim() : existing.name,
        module: module !== undefined ? module.trim().toLowerCase() : existing.module,
        description: description !== undefined ? (description ? description.trim() : null) : existing.description,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update permission error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Cập nhật quyền thất bại' }, { status: 500 });
  }
}

// DELETE /api/permissions - Delete a custom permission
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID quyền là bắt buộc' }, { status: 400 });
    }

    const existing = await prisma.permission.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy quyền này' }, { status: 404 });
    }

    // Delete related role permissions & user permissions first
    await prisma.rolePermission.deleteMany({ where: { permissionId: id } });
    await prisma.userPermission.deleteMany({ where: { permissionId: id } });

    await prisma.permission.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa quyền thành công' });
  } catch (error) {
    console.error('Delete permission error:', error);
    return NextResponse.json({ error: 'Xóa quyền thất bại' }, { status: 500 });
  }
}
