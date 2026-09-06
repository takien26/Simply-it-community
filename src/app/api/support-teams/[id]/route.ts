import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — Get single team detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const team = await prisma.supportTeam.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true }, orderBy: { sortOrder: 'asc' } },
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, department: true, avatarUrl: true } } },
        },
        queues: { orderBy: { isDefault: 'desc' } },
        routingRules: { orderBy: { priority: 'asc' } },
        _count: { select: { tickets: true, incidents: true } },
      },
    });

    if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error('Get support team error:', error);
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 });
  }
}

// PUT — Update team
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const team = await prisma.supportTeam.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code?.toUpperCase(),
        description: body.description ?? undefined,
        parentId: body.parentId ?? undefined,
        companyScope: body.companyScope ?? undefined,
        locationScope: body.locationScope ?? undefined,
        sortOrder: body.sortOrder ?? undefined,
        isActive: body.isActive ?? undefined,
      },
    });

    return NextResponse.json({ success: true, data: team });
  } catch (error) {
    console.error('Update support team error:', error);
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 });
  }
}

// DELETE — Delete team
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    await prisma.supportTeam.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete support team error:', error);
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 });
  }
}
