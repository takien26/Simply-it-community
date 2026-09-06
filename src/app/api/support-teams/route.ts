import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — List all support teams (with tree structure and members)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const teams = await prisma.supportTeam.findMany({
      include: {
        parent: { select: { id: true, name: true, code: true } },
        children: { select: { id: true, name: true, code: true } },
        members: {
          include: {
            user: { select: { id: true, fullName: true, email: true, department: true, position: true, avatarUrl: true } },
          },
        },
        queues: { select: { id: true, name: true, code: true, isDefault: true, isActive: true } },
        _count: { select: { tickets: true, incidents: true, members: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ success: true, data: teams });
  } catch (error) {
    console.error('List support teams error:', error);
    return NextResponse.json({ error: 'Failed to fetch support teams' }, { status: 500 });
  }
}

// POST — Create a new support team with members
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, code, description, parentId, companyScope, locationScope, sortOrder, memberIds } = body;

    if (!name || !code) {
      return NextResponse.json({ error: 'Tên team và mã code không được để trống' }, { status: 400 });
    }

    const existing = await prisma.supportTeam.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) {
      return NextResponse.json({ error: `Mã code "${code}" đã tồn tại` }, { status: 400 });
    }

    const team = await prisma.supportTeam.create({
      data: {
        name,
        code: code.toUpperCase(),
        description: description || null,
        parentId: parentId || null,
        companyScope: companyScope || null,
        locationScope: locationScope || null,
        sortOrder: sortOrder || 0,
        isActive: true,
      },
    });

    // Create default queue for new team
    await prisma.supportQueue.create({
      data: {
        name: `Hàng Đợi - ${team.name}`,
        code: `Q-${team.code}`,
        teamId: team.id,
        isDefault: false,
        isActive: true,
      },
    });

    // Add members if provided
    if (Array.isArray(memberIds) && memberIds.length > 0) {
      for (const uid of memberIds) {
        await prisma.teamMember.create({
          data: {
            teamId: team.id,
            userId: uid,
            role: 'MEMBER',
          },
        });
      }
    }

    const fullTeam = await prisma.supportTeam.findUnique({
      where: { id: team.id },
      include: {
        parent: true,
        children: true,
        members: { include: { user: true } },
        queues: true,
      },
    });

    return NextResponse.json({ success: true, data: fullTeam }, { status: 201 });
  } catch (error) {
    console.error('Create support team error:', error);
    return NextResponse.json({ error: 'Failed to create support team' }, { status: 500 });
  }
}

// PUT — Update support team, scopes & members
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, code, description, parentId, companyScope, locationScope, sortOrder, isActive, memberIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code.toUpperCase();
    if (description !== undefined) updateData.description = description;
    if (parentId !== undefined) updateData.parentId = parentId || null;
    if (companyScope !== undefined) updateData.companyScope = companyScope || null;
    if (locationScope !== undefined) updateData.locationScope = locationScope || null;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isActive !== undefined) updateData.isActive = !!isActive;

    const team = await prisma.supportTeam.update({
      where: { id },
      data: updateData,
    });

    // Update members if memberIds array is provided
    if (Array.isArray(memberIds)) {
      await prisma.teamMember.deleteMany({ where: { teamId: id } });
      for (const uid of memberIds) {
        await prisma.teamMember.create({
          data: {
            teamId: id,
            userId: uid,
            role: 'MEMBER',
          },
        });
      }
    }

    const fullTeam = await prisma.supportTeam.findUnique({
      where: { id: team.id },
      include: {
        parent: true,
        children: true,
        members: { include: { user: { select: { id: true, fullName: true, position: true } } } },
        queues: true,
      },
    });

    return NextResponse.json({ success: true, data: fullTeam });
  } catch (error) {
    console.error('Update support team error:', error);
    return NextResponse.json({ error: 'Failed to update support team' }, { status: 500 });
  }
}

// DELETE — Delete support team
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const team = await prisma.supportTeam.findUnique({ where: { id } });
    if (team?.code === 'IT-ALL') {
      return NextResponse.json({ error: 'Không thể xóa Team IT tổng thể của hệ thống' }, { status: 400 });
    }

    await prisma.supportTeam.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Support team deleted' });
  } catch (error) {
    console.error('Delete support team error:', error);
    return NextResponse.json({ error: 'Failed to delete support team' }, { status: 500 });
  }
}
