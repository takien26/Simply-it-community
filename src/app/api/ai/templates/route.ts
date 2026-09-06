import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

// GET /api/ai/templates — List active templates
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.aIExtractionTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ targetEntity: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        targetEntity: true,
        description: true,
        expectedFields: true,
        exampleOutput: true,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: templates });
  } catch (error) {
    console.error('List templates error:', error);
    return NextResponse.json(
      { error: 'Failed to list templates' },
      { status: 500 }
    );
  }
}

// POST /api/ai/templates — Create a new template (admin only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = await hasPermission(currentUser.userId, 'ai.templates.manage');
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, targetEntity, description, promptTemplate, expectedFields, exampleOutput } = body;

    if (!name || !targetEntity || !promptTemplate || !expectedFields) {
      return NextResponse.json(
        { error: 'name, targetEntity, promptTemplate, and expectedFields are required' },
        { status: 400 }
      );
    }

    const template = await prisma.aIExtractionTemplate.create({
      data: {
        name,
        targetEntity,
        description: description || null,
        promptTemplate,
        expectedFields,
        exampleOutput: exampleOutput || null,
      },
    });

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error('Create template error:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
