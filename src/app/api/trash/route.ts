import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getTrashRetentionDays, autoPurgeExpiredTrash } from '@/lib/trash';

// GET /api/trash - Lấy danh sách mục trong Thùng rác kèm thống kê
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tự động dọn dẹp các mục đã quá hạn lưu trữ
    await autoPurgeExpiredTrash().catch(() => {});

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const where: any = {};
    if (type && type !== 'ALL') {
      where.entityType = type.toUpperCase();
    }
    if (search) {
      where.OR = [
        { entityName: { contains: search, mode: 'insensitive' } },
        { entityCode: { contains: search, mode: 'insensitive' } },
        { deletedByName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalCount, retentionDays] = await Promise.all([
      prisma.trashItem.findMany({
        where,
        orderBy: { deletedAt: 'desc' },
      }),
      prisma.trashItem.count(),
      getTrashRetentionDays(),
    ]);

    // Thống kê phân loại
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: totalCount,
      expiringSoon: items.filter((i) => new Date(i.expiresAt) <= sevenDaysFromNow).length,
      retentionDays,
      byType: {
        ASSET: items.filter((i) => i.entityType === 'ASSET').length,
        USER: items.filter((i) => i.entityType === 'USER').length,
        LICENSE: items.filter((i) => i.entityType === 'LICENSE').length,
        TICKET: items.filter((i) => i.entityType === 'TICKET').length,
        DOCUMENT: items.filter((i) => i.entityType === 'DOCUMENT').length,
        CATEGORY: items.filter((i) => i.entityType === 'CATEGORY').length,
        VENDOR: items.filter((i) => i.entityType === 'VENDOR').length,
        OTHER: items.filter((i) => !['ASSET', 'USER', 'LICENSE', 'TICKET', 'DOCUMENT', 'CATEGORY', 'VENDOR'].includes(i.entityType)).length,
      },
    };

    return NextResponse.json({
      success: true,
      data: items,
      stats,
    });
  } catch (error: any) {
    console.error('Fetch trash items error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tải Thùng rác' }, { status: 500 });
  }
}
