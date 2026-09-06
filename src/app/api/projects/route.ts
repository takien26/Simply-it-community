import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// GET /api/projects - List all projects with aggregated stats
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch all registered projects from DB
    const dbProjects = await prisma.project.findMany({
      include: {
        vendor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. Fetch all documents with project names
    const docs = await prisma.document.findMany({
      where: { projectName: { not: null } },
      select: {
        id: true,
        title: true,
        type: true,
        projectName: true,
        projectCode: true,
        contractNumber: true,
        invoiceNumber: true,
        companyName: true,
        vendorName: true,
        amount: true,
        documentDate: true,
        fileName: true,
        fileUrl: true,
        attachments: true,
        asset: { select: { id: true, assetTag: true, name: true, serialNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projectMap = new Map<string, {
      name: string;
      code?: string;
      totalDocs: number;
      totalAmount: number;
      companies: Set<string>;
      vendors: Set<string>;
      types: Set<string>;
      documents: any[];
      linkedAssets: any[];
      latestDate?: string;
    }>();

    // Initialize map with all registered projects from database
    for (const dp of dbProjects) {
      const pName = dp.name.trim();
      const compSet = new Set<string>();
      if (dp.companyName) compSet.add(dp.companyName);
      const vendSet = new Set<string>();
      if (dp.vendor?.name) vendSet.add(dp.vendor.name);

      projectMap.set(pName, {
        name: pName,
        code: dp.code || undefined,
        totalDocs: 0,
        totalAmount: 0,
        companies: compSet,
        vendors: vendSet,
        types: new Set(),
        documents: [],
        linkedAssets: [],
        latestDate: dp.createdAt ? dp.createdAt.toISOString() : undefined,
      });
    }

    // Aggregate documents into projects
    for (const doc of docs) {
      if (!doc.projectName) continue;
      const pName = doc.projectName.trim();
      if (!projectMap.has(pName)) {
        projectMap.set(pName, {
          name: pName,
          code: doc.projectCode || undefined,
          totalDocs: 0,
          totalAmount: 0,
          companies: new Set(),
          vendors: new Set(),
          types: new Set(),
          documents: [],
          linkedAssets: [],
          latestDate: doc.documentDate ? doc.documentDate.toISOString() : undefined,
        });
      }

      const p = projectMap.get(pName)!;
      p.totalDocs += 1;
      if (doc.amount) p.totalAmount += Number(doc.amount);
      if (doc.companyName) p.companies.add(doc.companyName);
      if (doc.vendorName) p.vendors.add(doc.vendorName);
      p.types.add(doc.type);
      p.documents.push(doc);
      if (doc.asset && !p.linkedAssets.some((a) => a.id === doc.asset?.id)) {
        p.linkedAssets.push(doc.asset);
      }
    }

    const projects = Array.from(projectMap.values()).map((p) => ({
      name: p.name,
      code: p.code,
      totalDocs: p.totalDocs,
      totalAmount: p.totalAmount,
      companies: Array.from(p.companies),
      vendors: Array.from(p.vendors),
      types: Array.from(p.types),
      documents: p.documents,
      linkedAssets: p.linkedAssets,
      latestDate: p.latestDate,
    }));

    return NextResponse.json({ success: true, data: projects });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Register a new project name / bundle permanently in DB
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: 'Tên dự án / gói mua sắm không được để trống' }, { status: 400 });
    }

    const code = body.code?.trim() || null;
    const companyName = body.companyName?.trim() || null;
    const vendorId = body.vendorId && body.vendorId.trim() !== '' ? body.vendorId.trim() : null;
    const description = body.description?.trim() || body.notes?.trim() || null;

    const project = await prisma.project.upsert({
      where: { name },
      update: {
        code: code || undefined,
        companyName: companyName || undefined,
        vendorId: vendorId || undefined,
        description: description || undefined,
      },
      create: {
        name,
        code,
        companyName,
        vendorId,
        description,
        createdById: currentUser.userId,
      },
    });

    return NextResponse.json({
      success: true,
      data: { name: project.name, code: project.code, id: project.id },
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create project' }, { status: 500 });
  }
}

// PUT /api/projects - Rename a project across documents & DB
export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { oldName, newName, newCode } = await request.json();
    if (!oldName || !newName) {
      return NextResponse.json({ error: 'Tên cũ và mới là bắt buộc' }, { status: 400 });
    }

    // Update in project table
    await prisma.project.updateMany({
      where: { name: oldName },
      data: {
        name: newName,
        ...(newCode !== undefined ? { code: newCode || null } : {}),
      },
    });

    // Update in documents
    const updated = await prisma.document.updateMany({
      where: { projectName: oldName },
      data: {
        projectName: newName,
        ...(newCode !== undefined ? { projectCode: newCode || null } : {}),
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

// DELETE /api/projects - Delete project & clear project name from documents
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const name = request.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Tên dự án là bắt buộc' }, { status: 400 });
    }

    await prisma.project.deleteMany({
      where: { name },
    });

    const updated = await prisma.document.updateMany({
      where: { projectName: name },
      data: { projectName: null, projectCode: null },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
}
