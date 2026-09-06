import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

// GET /api/categories - List categories
export async function GET() {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { isActive: true },
      include: {
        children: { where: { isActive: true } },
        _count: { select: { assets: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to list categories' }, { status: 500 });
  }
}

// POST /api/categories - Create new category
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = await hasPermission(currentUser.userId, 'categories.create');
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo danh mục tài sản' }, { status: 403 });
    }

    const body = await request.json();
    const { name, icon, parentId, description, customFields } = body;

    if (!name) {
      return NextResponse.json({ error: 'Tên danh mục là bắt buộc' }, { status: 400 });
    }

    const category = await prisma.assetCategory.create({
      data: {
        name,
        icon: icon || '📦',
        parentId: parentId || null,
        description: description || null,
        customFields: customFields ? (customFields as any) : undefined,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
