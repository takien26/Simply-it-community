import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { ProblemPriority, ProblemStatus } from '@prisma/client';

// GET — List problems with linked incidents
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') as ProblemStatus | null;
    const priority = searchParams.get('priority') as ProblemPriority | null;

    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { problemNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { rootCause: { contains: search, mode: 'insensitive' } },
        { permanentSolution: { contains: search, mode: 'insensitive' } },
      ];
    }

    const problems = await prisma.problem.findMany({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        assignedTo: { select: { id: true, fullName: true, email: true, avatarUrl: true } },
        incidents: {
          select: {
            id: true,
            incidentNumber: true,
            title: true,
            severity: true,
            status: true,
            startedAt: true,
            resolvedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { incidents: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const allProblems = await prisma.problem.findMany({
      select: { status: true, priority: true },
    });

    const stats = {
      total: allProblems.length,
      open: allProblems.filter((p) => p.status !== 'RESOLVED' && p.status !== 'CLOSED').length,
      rootCauseAnalysis: allProblems.filter((p) => p.status === 'UNDER_INVESTIGATION').length,
      knownError: allProblems.filter((p) => p.status === 'KNOWN_ERROR').length,
      resolved: allProblems.filter((p) => p.status === 'RESOLVED' || p.status === 'CLOSED').length,
    };

    return NextResponse.json({ success: true, data: problems, stats });
  } catch (error) {
    console.error('List problems error:', error);
    return NextResponse.json({ error: 'Failed to fetch problems' }, { status: 500 });
  }
}

// POST — Create a new Problem (can be spawned from an Incident)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      status,
      rootCause,
      permanentSolution,
      workaround,
      assignedToId,
      incidentIds,
    } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Tiêu đề và mô tả vấn đề không được để trống' }, { status: 400 });
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.problem.count();
    const problemNumber = `PRB-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const problem = await prisma.problem.create({
      data: {
        problemNumber,
        title,
        description,
        priority: priority || 'MEDIUM',
        status: status || 'OPEN',
        rootCause: rootCause || null,
        permanentSolution: permanentSolution || null,
        workaround: workaround || null,
        createdById: currentUser.userId,
        assignedToId: assignedToId || null,
        ...(incidentIds && Array.isArray(incidentIds) && incidentIds.length > 0
          ? {
              incidents: {
                connect: incidentIds.map((id: string) => ({ id })),
              },
            }
          : {}),
      },
      include: {
        createdBy: { select: { id: true, fullName: true } },
        incidents: { select: { id: true, incidentNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: problem }, { status: 201 });
  } catch (error) {
    console.error('Create problem error:', error);
    return NextResponse.json({ error: 'Failed to create problem' }, { status: 500 });
  }
}

// PUT — Update Problem
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, description, priority, status, rootCause, permanentSolution, workaround, assignedToId, linkIncidentIds, unlinkIncidentId } = body;

    if (!id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status) {
      updateData.status = status;
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
    }
    if (rootCause !== undefined) updateData.rootCause = rootCause;
    if (permanentSolution !== undefined) updateData.permanentSolution = permanentSolution;
    if (workaround !== undefined) updateData.workaround = workaround;
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;

    if (linkIncidentIds && Array.isArray(linkIncidentIds)) {
      updateData.incidents = {
        connect: linkIncidentIds.map((iid: string) => ({ id: iid })),
      };
    }
    if (unlinkIncidentId) {
      updateData.incidents = {
        disconnect: { id: unlinkIncidentId },
      };
    }

    const problem = await prisma.problem.update({
      where: { id },
      data: updateData,
      include: {
        incidents: { select: { id: true, incidentNumber: true, title: true } },
      },
    });

    return NextResponse.json({ success: true, data: problem });
  } catch (error) {
    console.error('Update problem error:', error);
    return NextResponse.json({ error: 'Failed to update problem' }, { status: 500 });
  }
}

// DELETE — Delete Problem
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Problem ID is required' }, { status: 400 });
    }

    await prisma.problem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete problem error:', error);
    return NextResponse.json({ error: 'Failed to delete problem' }, { status: 500 });
  }
}
