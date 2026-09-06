import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        department: true,
        avatarUrl: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Active asset assignments
    const assetAssignments = await prisma.assetAssignment.findMany({
      where: {
        userId: currentUser.userId,
        returnedAt: null,
      },
      include: {
        asset: {
          include: {
            category: true,
            vendor: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
            location: true,
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Active license assignments
    const licenseAssignments = await prisma.licenseAssignment.findMany({
      where: {
        userId: currentUser.userId,
        revokedAt: null,
      },
      include: {
        license: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'desc' },
    });

    // Recent tickets created by user
    const tickets = await prisma.ticket.findMany({
      where: {
        createdById: currentUser.userId,
      },
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            name: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const openTicketsCount = tickets.filter(
      (t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'WAITING'
    ).length;
    const resolvedTicketsCount = tickets.filter(
      (t) => t.status === 'RESOLVED' || t.status === 'CLOSED'
    ).length;

    return NextResponse.json({
      success: true,
      user: userProfile,
      assets: assetAssignments,
      licenses: licenseAssignments,
      tickets,
      stats: {
        totalAssets: assetAssignments.length,
        totalLicenses: licenseAssignments.length,
        openTickets: openTicketsCount,
        resolvedTickets: resolvedTicketsCount,
        totalTickets: tickets.length,
      },
    });
  } catch (error) {
    console.error('Portal data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portal data' },
      { status: 500 }
    );
  }
}
