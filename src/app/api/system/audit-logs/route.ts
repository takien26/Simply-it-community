import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { Prisma, AuditAction } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canViewAudit = await hasPermission(currentUser.userId, 'audit.view');
    const isAdmin = currentUser.roleName === 'Admin' || currentUser.roleName === 'admin' || canViewAudit;

    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden: Chỉ Quản trị viên (Admin) mới có quyền xem Nhật ký hoạt động hệ thống' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    // Filter by Date Range
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.createdAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Filter by Action
    if (action && action !== 'ALL') {
      where.action = action as AuditAction;
    }

    // Filter by Entity Type
    if (entityType && entityType !== 'ALL') {
      where.entityType = {
        equals: entityType,
        mode: 'insensitive',
      };
    }

    // Filter by Search (User name, email, entityId, etc.)
    if (search) {
      where.OR = [
        {
          user: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
        {
          user: {
            email: { contains: search, mode: 'insensitive' },
          },
        },
        {
          entityType: { contains: search, mode: 'insensitive' },
        },
        {
          entityId: { contains: search, mode: 'insensitive' },
        },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Audit logs fetch error:', error);
    return NextResponse.json({ error: 'Lỗi máy chủ khi tải nhật ký hoạt động' }, { status: 500 });
  }
}
