import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/floor-maps - List all floor maps
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const maps = await prisma.floorMap.findMany({
      include: {
        location: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: maps });
  } catch (error: any) {
    console.error('List floor maps error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tải sơ đồ mặt bằng' }, { status: 500 });
  }
}

// POST /api/floor-maps - Create new floor map
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, locationId, imageUrl, markers = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Tên sơ đồ không được để trống' }, { status: 400 });
    }

    let targetLocationId = locationId;
    if (!targetLocationId) {
      const firstLoc = await prisma.location.findFirst();
      if (firstLoc) {
        targetLocationId = firstLoc.id;
      } else {
        const newLoc = await prisma.location.create({
          data: { name: 'Văn Phòng Chính', building: 'Tòa A', floor: 'Tầng 1' },
        });
        targetLocationId = newLoc.id;
      }
    }

    const newMap = await prisma.floorMap.create({
      data: {
        name: name.trim(),
        locationId: targetLocationId,
        imageUrl: imageUrl || '/images/sample-floorplan.svg',
        markers: markers,
      },
      include: {
        location: true,
      },
    });

    return NextResponse.json({ success: true, data: newMap, message: 'Đã tạo sơ đồ mặt bằng mới' }, { status: 201 });
  } catch (error: any) {
    console.error('Create floor map error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi tạo sơ đồ' }, { status: 500 });
  }
}
