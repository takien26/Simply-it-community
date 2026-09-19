import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { moveToTrash } from '@/lib/trash';
import { hasPermission, isAdminOrAbove } from '@/lib/permissions';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'spare_parts.manage'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền quản lý kho linh kiện' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      sku,
      categoryId,
      minStock,
      unit,
      unitPrice,
      currency,
      vendorId,
      locationId,
      notes,
    } = body;

    const updated = await prisma.sparePart.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(minStock !== undefined && { minStock: Number(minStock) }),
        ...(unit && { unit }),
        ...(unitPrice !== undefined && { unitPrice: unitPrice ? Number(unitPrice) : null }),
        ...(currency && { currency }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(locationId !== undefined && { locationId: locationId || null }),
        ...(notes !== undefined && { notes: notes || null }),
      },
    });

    return NextResponse.json({ success: true, sparePart: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'spare_parts.manage'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền quản lý kho linh kiện' }, { status: 403 });
    }

    const { id } = await params;
    const existing = await prisma.sparePart.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy linh kiện phụ tùng' }, { status: 404 });
    }

    // Lưu snapshot linh kiện phụ tùng vào Thùng rác trước khi xóa
    const trashResult = await moveToTrash({
      entityType: 'SPARE_PART',
      entityId: id,
      entityName: existing.name,
      entityCode: existing.sku || null,
      dataSnapshot: existing,
      deletedById: user.userId,
      deletedByName: user.fullName || user.email,
    }).catch((err) => {
      console.error('Failed to snapshot spare part to trash:', err);
      return null;
    });

    await prisma.$transaction(async (tx) => {
      await tx.sparePartTransaction.deleteMany({
        where: { sparePartId: id },
      });
      await tx.sparePart.delete({ where: { id } });
    });

    return NextResponse.json({
      success: true,
      message: trashResult
        ? `Đã chuyển linh kiện vào Thùng rác (Lưu trữ ${trashResult.retentionDays} ngày)`
        : 'Đã xóa linh kiện phụ tùng thành công',
      inTrash: !!trashResult,
      trashItemId: trashResult?.trashItem?.id || null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
