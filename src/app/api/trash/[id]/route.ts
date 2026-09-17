import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// DELETE /api/trash/[id] - Xóa vĩnh viễn mục khỏi Thùng rác (Hard Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.trashItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Mục không tồn tại trong Thùng rác' }, { status: 404 });
    }

    await prisma.trashItem.delete({ where: { id } });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'TrashItem',
      entityId: id,
      userId: currentUser.userId,
      changes: { permanentlyDeleted: { name: existing.entityName, type: existing.entityType } },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa vĩnh viễn thành công' });
  } catch (error: any) {
    console.error('Delete trash item error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi xóa vĩnh viễn' }, { status: 500 });
  }
}
