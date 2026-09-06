import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — List team members
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const members = await prisma.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, department: true, avatarUrl: true, isActive: true,
            assignedTickets: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING'] } },
              select: { id: true },
            },
          },
        },
      },
    });

    const enriched = members.map(m => ({
      ...m,
      openTickets: m.user.assignedTickets.length,
      user: { ...m.user, assignedTickets: undefined },
    }));

    return NextResponse.json({ success: true, data: enriched });
  } catch (error) {
    console.error('List team members error:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// POST — Add member to team
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const { userId, role, primarySkills, secondarySkills, skillLevel, maxTickets } = body;
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });

    // Check if already a member
    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId } },
    });
    if (existing) return NextResponse.json({ error: 'Nhân sự này đã là thành viên của Team' }, { status: 400 });

    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        userId,
        role: role || 'MEMBER',
        primarySkills: primarySkills || [],
        secondarySkills: secondarySkills || [],
        skillLevel: skillLevel || null,
        maxTickets: maxTickets || 20,
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, department: true } },
      },
    });

    return NextResponse.json({ success: true, data: member }, { status: 201 });
  } catch (error) {
    console.error('Add team member error:', error);
    return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
  }
}

// DELETE — Remove member from team (via query param memberId)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    if (!memberId) return NextResponse.json({ error: 'memberId is required' }, { status: 400 });

    await prisma.teamMember.delete({ where: { id: memberId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}
