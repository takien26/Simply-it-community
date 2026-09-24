import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isAdminOrAbove, hasPermission } from '@/lib/permissions';
import { calculateAssetHealth } from '@/lib/asset-health';
import { calculateNextRunDate, encodeScheduleConfig } from '@/lib/maintenance-cron';
import { MaintenanceFrequency, MaintenanceType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export interface PredictiveCandidate {
  assetId: string;
  assetTag: string;
  name: string;
  model?: string | null;
  categoryName?: string;
  assignedTo?: string | null;
  department?: string | null;
  condition: string;
  healthScore: number;
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reasons: string[];
  suggestedType: MaintenanceType;
  suggestedFrequency: MaintenanceFrequency;
  lastMaintenanceDate?: string | null;
  recentTicketCount: number;
}

// GET /api/maintenance-schedules/predictive
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Query active assets that are in use or available
    const assets = await prisma.asset.findMany({
      where: {
        status: { in: ['IN_USE', 'AVAILABLE'] },
      },
      include: {
        category: { select: { name: true } },
        maintenanceLogs: {
          orderBy: { performedAt: 'desc' },
          take: 5,
        },
        maintenanceSchedules: {
          where: { isActive: true },
        },
        tickets: {
          where: { createdAt: { gte: ninetyDaysAgo } },
          select: { id: true, createdAt: true, priority: true },
        },
        assignments: {
          where: { returnedAt: null },
          include: {
            user: { select: { fullName: true, department: true } },
          },
        },
      },
    });

    const candidates: PredictiveCandidate[] = [];

    for (const a of assets) {
      // If asset already has an active maintenance schedule scheduled for the future, skip
      const hasUpcomingSchedule = a.maintenanceSchedules.some(
        (s) => s.isActive && new Date(s.nextRunAt) >= now
      );
      if (hasUpcomingSchedule) continue;

      const health = calculateAssetHealth(a);
      const reasons: string[] = [];
      let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
      let suggestedType: MaintenanceType = 'INSPECTION';

      // 1. Check maintenance history
      const lastLog = a.maintenanceLogs[0];
      const purchaseOrCreated = a.purchaseDate ? new Date(a.purchaseDate) : new Date(a.createdAt);

      if (!lastLog) {
        if (purchaseOrCreated < sixMonthsAgo) {
          reasons.push('Thiết bị hoạt động > 6 tháng nhưng chưa từng được bảo trì định kỳ');
          suggestedType = 'CLEANING';
        }
      } else if (new Date(lastLog.performedAt) < sixMonthsAgo) {
        const daysSince = Math.floor((now.getTime() - new Date(lastLog.performedAt).getTime()) / (24 * 60 * 60 * 1000));
        reasons.push(`Đã qua ${daysSince} ngày kể từ lần bảo trì cuối cùng (vượt mốc 180 ngày)`);
        suggestedType = 'CLEANING';
      }

      // 2. Check ticket frequency
      const recentTickets = a.tickets.length;
      if (recentTickets >= 2) {
        reasons.push(`Phát sinh ${recentTickets} sự cố/ticket trong 90 ngày gần nhất`);
        urgency = recentTickets >= 3 ? 'CRITICAL' : 'HIGH';
        suggestedType = 'INSPECTION';
      }

      // 3. Check health and condition
      if (a.condition === 'POOR' || a.condition === 'BROKEN') {
        reasons.push(`Tình trạng vật lý ghi nhận: ${a.condition}`);
        urgency = 'CRITICAL';
        suggestedType = 'REPAIR';
      } else if (health.healthScore < 50) {
        reasons.push(`Chỉ số sức khỏe suy giảm còn ${health.healthScore}/100`);
        if (urgency !== 'CRITICAL') urgency = 'HIGH';
      }

      if (reasons.length > 0) {
        const assignedUser = a.assignments[0]?.user;
        candidates.push({
          assetId: a.id,
          assetTag: a.assetTag,
          name: a.name,
          model: a.model,
          categoryName: a.category?.name,
          assignedTo: assignedUser?.fullName || null,
          department: assignedUser?.department || null,
          condition: a.condition,
          healthScore: health.healthScore,
          urgency,
          reasons,
          suggestedType,
          suggestedFrequency: urgency === 'CRITICAL' ? 'MONTHLY' : 'SEMI_ANNUAL',
          lastMaintenanceDate: lastLog ? new Date(lastLog.performedAt).toISOString() : null,
          recentTicketCount: recentTickets,
        });
      }
    }

    // Sort by urgency: CRITICAL > HIGH > MEDIUM
    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    candidates.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency] || a.healthScore - b.healthScore);

    return NextResponse.json({
      success: true,
      totalCandidates: candidates.length,
      candidates,
    });
  } catch (error: any) {
    console.error('Predictive maintenance scan error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi quét bảo trì dự đoán' },
      { status: 500 }
    );
  }
}

// POST /api/maintenance-schedules/predictive
// Batch create predictive maintenance schedules
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canCreate = isAdminOrAbove(user.roleName) || (await hasPermission(user.userId, 'assets.maintenance.create'));
    if (!canCreate) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo lịch bảo trì' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const assetIds: string[] = Array.isArray(body.assetIds) ? body.assetIds : [];
    const defaultFrequency: MaintenanceFrequency = body.frequency || 'SEMI_ANNUAL';
    const defaultType: MaintenanceType = body.maintenanceType || 'INSPECTION';
    const assignToId: string | null = body.assignToId || null;
    const autoCreateTicket: boolean = body.autoCreateTicket !== undefined ? Boolean(body.autoCreateTicket) : true;

    // Schedule next run for 7 days ahead (or immediate upcoming weekend)
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 7);
    nextRun.setHours(9, 0, 0, 0);

    const targetAssets = await prisma.asset.findMany({
      where: {
        ...(assetIds.length > 0 ? { id: { in: assetIds } } : { status: { in: ['IN_USE', 'AVAILABLE'] } }),
      },
      select: {
        id: true,
        assetTag: true,
        name: true,
      },
    });

    const createdSchedules: any[] = [];

    for (const asset of targetAssets) {
      const scheduleName = `[Bảo Trì Dự Đoán] ${asset.name} (${asset.assetTag})`;
      const desc = encodeScheduleConfig(
        `Lịch bảo trì tự động tạo bởi Hệ thống AI & Rule-based Predictive Maintenance để phòng ngừa sự cố phần cứng.`,
        { repeatMode: 'WEEKDAYS', selectedDays: [1, 2, 3, 4, 5], runTime: '09:00' }
      );

      const s = await prisma.maintenanceSchedule.create({
        data: {
          name: scheduleName,
          description: desc,
          frequency: defaultFrequency,
          maintenanceType: defaultType,
          assetId: asset.id,
          nextRunAt: nextRun,
          ticketPriority: 'HIGH',
          assignToId,
          autoCreateTicket,
          isActive: true,
        },
      });

      createdSchedules.push({
        id: s.id,
        name: s.name,
        assetId: asset.id,
        assetTag: asset.assetTag,
        nextRunAt: s.nextRunAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã tự động khởi tạo thành công ${createdSchedules.length} lịch bảo trì dự đoán cho các thiết bị!`,
      count: createdSchedules.length,
      schedules: createdSchedules,
    });
  } catch (error: any) {
    console.error('Batch create predictive maintenance error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khởi tạo lịch bảo trì dự đoán' },
      { status: 500 }
    );
  }
}
