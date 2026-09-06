import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET — Incident detail
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const incident = await prisma.incident.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, fullName: true, email: true, avatarUrl: true, department: true } },
        assignedTo: { select: { id: true, fullName: true, email: true, avatarUrl: true, department: true } },
        team: { select: { id: true, name: true, code: true } },
        problem: {
          select: {
            id: true,
            problemNumber: true,
            title: true,
            status: true,
            rootCause: true,
            permanentSolution: true,
          },
        },
        tickets: {
          include: {
            createdBy: { select: { id: true, fullName: true, email: true, department: true } },
            assignedTo: { select: { id: true, fullName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        updates: {
          include: {
            user: { select: { id: true, fullName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: incident });
  } catch (error) {
    console.error('Get incident error:', error);
    return NextResponse.json({ error: 'Failed to fetch incident' }, { status: 500 });
  }
}

// PUT — Update incident status / details / link tickets
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;
    const body = await request.json();

    const current = await prisma.incident.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

    const updateData: any = {};
    if (body.title) updateData.title = body.title;
    if (body.description) updateData.description = body.description;
    if (body.severity) updateData.severity = body.severity;
    if (body.impact !== undefined) updateData.impact = body.impact;
    if (body.workaround !== undefined) updateData.workaround = body.workaround;
    if (body.resolutionNotes !== undefined) updateData.resolutionNotes = body.resolutionNotes;
    if (body.teamId !== undefined) updateData.teamId = body.teamId;
    if (body.assignedToId !== undefined) updateData.assignedToId = body.assignedToId;
    if (body.problemId !== undefined) updateData.problemId = body.problemId;

    // Status transition timestamps
    if (body.status && body.status !== current.status) {
      updateData.status = body.status;
      if (body.status === 'IDENTIFIED' && !current.identifiedAt) {
        updateData.identifiedAt = new Date();
      }
      if (body.status === 'RESOLVED' && !current.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (body.status === 'CLOSED' && !current.closedAt) {
        updateData.closedAt = new Date();
      }
    }

    // Handle ticket linking / unlinking
    if (body.linkTicketIds && Array.isArray(body.linkTicketIds)) {
      updateData.tickets = {
        connect: body.linkTicketIds.map((tid: string) => ({ id: tid })),
      };
    }
    if (body.unlinkTicketId) {
      updateData.tickets = {
        disconnect: { id: body.unlinkTicketId },
      };
    }

    const updated = await prisma.incident.update({
      where: { id },
      data: updateData,
    });

    // Post timeline update if content provided or status changed
    if (body.updateNote || (body.status && body.status !== current.status)) {
      await prisma.incidentUpdate.create({
        data: {
          incidentId: id,
          userId: currentUser.userId,
          content:
            body.updateNote ||
            `Chuyển trạng thái sự cố từ ${current.status} sang ${body.status || current.status}.`,
          statusChange: body.status || null,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update incident error:', error);
    return NextResponse.json({ error: 'Failed to update incident' }, { status: 500 });
  }
}

// DELETE — Delete incident
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    await prisma.incident.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete incident error:', error);
    return NextResponse.json({ error: 'Failed to delete incident' }, { status: 500 });
  }
}
