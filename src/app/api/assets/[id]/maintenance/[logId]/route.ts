import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canDelete = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'assets.maintenance.delete')) || (await hasPermission(currentUser.userId, 'assets.delete'));
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền xóa phiếu sửa chữa / bảo trì' }, { status: 403 });
    }

    const { logId } = await params;
    await prisma.assetMaintenanceLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ success: true, message: 'Đã xóa bản ghi thành công' });
  } catch (error) {
    console.error('Delete maintenance log error:', error);
    return NextResponse.json({ error: 'Failed to delete maintenance log' }, { status: 500 });
  }
}
