import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, data: locations });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, building, floor, notes } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên vị trí/phòng là bắt buộc' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name,
        building: building || null,
        floor: floor || null,
        notes: notes || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: location }, { status: 201 });
  } catch (error) {
    console.error('Create location error:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
