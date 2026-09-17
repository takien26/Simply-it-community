import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

// POST /api/trash/empty - Dọn sạch thùng rác (tất cả hoặc chỉ mục hết hạn)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const onlyExpired = body.onlyExpired === true;

    const where: any = {};
    if (onlyExpired) {
      where.expiresAt = { lte: new Date() };
    }

    const result = await prisma.trashItem.deleteMany({ where });

    await createAuditLog({
      action: 'DELETE',
      entityType: 'TrashItem',
      entityId: 'ALL',
      userId: currentUser.userId,
      changes: { emptiedCount: result.count, onlyExpired },
    });

    return NextResponse.json({
      success: true,
      message: `Đã dọn dẹp ${result.count} mục khỏi Thùng rác`,
      count: result.count,
    });
  } catch (error: any) {
    console.error('Empty trash error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi dọn thùng rác' }, { status: 500 });
  }
}
