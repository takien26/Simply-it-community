import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

    const assignments = await prisma.assetAssignment.findMany({
      where: {
        userId: id,
        returnedAt: null,
      },
      include: {
        asset: {
          include: {
            category: { select: { id: true, name: true, icon: true } },
            location: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    const assets = assignments.map((a) => ({
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
      locationName: a.asset.location?.name,
      status: a.asset.status,
      condition: a.asset.condition,
    }));

    return NextResponse.json({ success: true, data: assets });
  } catch (error) {
    console.error('Fetch user assets error:', error);
    return NextResponse.json({ error: 'Failed to fetch user assets' }, { status: 500 });
  }
}
