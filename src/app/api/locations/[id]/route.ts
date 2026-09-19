import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

// PUT /api/locations/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'locations.update'));
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền sửa vị trí' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, building, floor, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên vị trí là bắt buộc' }, { status: 400 });
    }

    const updated = await prisma.location.update({
      where: { id },
      data: {
        name,
        building: building !== undefined ? building : undefined,
        floor: floor !== undefined ? floor : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

// DELETE /api/locations/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'locations.delete'));
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa vị trí' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: 'Location deactivated' });
  } catch (error) {
    console.error('Delete location error:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
