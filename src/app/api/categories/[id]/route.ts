import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { moveToTrash } from '@/lib/trash';

// PUT /api/categories/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'categories.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa danh mục tài sản' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, icon, parentId, description, customFields } = body;

    const updated = await prisma.assetCategory.update({
      where: { id },
      data: {
        name: name || undefined,
        icon: icon !== undefined ? icon : undefined,
        parentId: parentId !== undefined ? parentId : undefined,
        description: description !== undefined ? description : undefined,
        customFields: customFields !== undefined ? (customFields as any) : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

// DELETE /api/categories/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = await hasPermission(currentUser.userId, 'categories.delete');
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa danh mục tài sản' }, { status: 403 });
    }

    const { id } = await params;
    const category = await prisma.assetCategory.findUnique({ where: { id } });
    if (!category) {
      return NextResponse.json({ error: 'Không tìm thấy danh mục' }, { status: 404 });
    }

    // Check if category has assets
    const assetCount = await prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      return NextResponse.json(
        { error: `Không thể xóa danh mục đang chứa ${assetCount} tài sản. Hãy chuyển tài sản sang danh mục khác trước.` },
        { status: 400 }
      );
    }

    const { trashItem } = await moveToTrash({
      entityType: 'CATEGORY',
      entityId: category.id,
      entityName: category.name,
      entityCode: category.icon || '📦',
      dataSnapshot: {
        ...category,
        categoryType: 'ASSET',
      },
      deletedById: currentUser.userId,
      deletedByName: currentUser.fullName,
    });

    await prisma.assetCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Đã xóa danh mục và chuyển vào thùng rác',
      trashItemId: trashItem.id,
    });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
