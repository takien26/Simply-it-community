import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/floor-maps/[id]
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
    const map = await prisma.floorMap.findUnique({
      where: { id },
      include: { location: true },
    });

    if (!map) {
      return NextResponse.json({ error: 'Không tìm thấy sơ đồ' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: map });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tải sơ đồ' }, { status: 500 });
  }
}

// PUT /api/floor-maps/[id] - Update floor map name, imageUrl, or markers
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
    const { name, locationId, imageUrl, markers } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (locationId !== undefined) dataToUpdate.locationId = locationId;
    if (imageUrl !== undefined) dataToUpdate.imageUrl = imageUrl;
    if (markers !== undefined) dataToUpdate.markers = markers;

    const updated = await prisma.floorMap.update({
      where: { id },
      data: dataToUpdate,
      include: { location: true },
    });

    return NextResponse.json({ success: true, data: updated, message: 'Đã lưu thay đổi sơ đồ mặt bằng' });
  } catch (error: any) {
    console.error('Update floor map error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi cập nhật sơ đồ' }, { status: 500 });
  }
}

// DELETE /api/floor-maps/[id]
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
    await prisma.floorMap.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Đã xóa sơ đồ mặt bằng' });
  } catch (error: any) {
    console.error('Delete floor map error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xóa sơ đồ' }, { status: 500 });
  }
}
