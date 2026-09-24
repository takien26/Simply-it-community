import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { getOrInitPolicies } from '@/lib/health/alert-engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const policies = await getOrInitPolicies();
    return NextResponse.json({ success: true, policies });
  } catch (error: any) {
    console.error('Error fetching health policies:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage =
      currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'settings.manage'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền chỉnh sửa cấu hình hệ thống' }, { status: 403 });
    }

    const body = await request.json();

    // Support batch update: { policies: [...] }
    if (Array.isArray(body.policies)) {
      const updatedList = [];
      for (const item of body.policies) {
        if (!item.id && !item.metric) continue;
        const isEn = typeof item.isEnabled === 'boolean' ? item.isEnabled : (typeof item.enabled === 'boolean' ? item.enabled : undefined);
        const dur = typeof item.durationMinutes === 'number' ? item.durationMinutes : (typeof item.sustainedMinutes === 'number' ? item.sustainedMinutes : undefined);

        const updated = await prisma.healthAlertPolicy.update({
          where: item.id ? { id: item.id } : { metric: item.metric },
          data: {
            ...(typeof isEn === 'boolean' ? { isEnabled: isEn } : {}),
            ...(item.warningThreshold !== undefined ? { warningThreshold: item.warningThreshold === null ? null : Number(item.warningThreshold) } : {}),
            ...(item.criticalThreshold !== undefined ? { criticalThreshold: item.criticalThreshold === null ? null : Number(item.criticalThreshold) } : {}),
            ...(item.clearThreshold !== undefined ? { clearThreshold: item.clearThreshold === null ? null : Number(item.clearThreshold) } : {}),
            ...(dur !== undefined ? { durationMinutes: dur } : {}),
            ...(item.severity ? { severity: item.severity } : {}),
            ...(typeof item.autoCreateTicket === 'boolean' ? { autoCreateTicket: item.autoCreateTicket } : {}),
            ...(item.ticketPriority ? { ticketPriority: item.ticketPriority } : {}),
          },
        });
        updatedList.push(updated);
      }
      return NextResponse.json({ success: true, policies: updatedList });
    }

    // Support single policy update
    const { id, metric, isEnabled, enabled, warningThreshold, criticalThreshold, clearThreshold, durationMinutes, sustainedMinutes, severity, autoCreateTicket, ticketPriority } = body;

    if (!id && !metric) {
      return NextResponse.json({ error: 'Thiếu ID hoặc metric của chính sách cần cập nhật' }, { status: 400 });
    }

    const isEn = typeof isEnabled === 'boolean' ? isEnabled : (typeof enabled === 'boolean' ? enabled : undefined);
    const dur = typeof durationMinutes === 'number' ? durationMinutes : (typeof sustainedMinutes === 'number' ? sustainedMinutes : undefined);

    const updated = await prisma.healthAlertPolicy.update({
      where: id ? { id } : { metric },
      data: {
        ...(typeof isEn === 'boolean' ? { isEnabled: isEn } : {}),
        ...(warningThreshold !== undefined ? { warningThreshold: warningThreshold === null ? null : Number(warningThreshold) } : {}),
        ...(criticalThreshold !== undefined ? { criticalThreshold: criticalThreshold === null ? null : Number(criticalThreshold) } : {}),
        ...(clearThreshold !== undefined ? { clearThreshold: clearThreshold === null ? null : Number(clearThreshold) } : {}),
        ...(dur !== undefined ? { durationMinutes: dur } : {}),
        ...(severity ? { severity } : {}),
        ...(typeof autoCreateTicket === 'boolean' ? { autoCreateTicket } : {}),
        ...(ticketPriority ? { ticketPriority } : {}),
      },
    });

    return NextResponse.json({ success: true, policy: updated });
  } catch (error: any) {
    console.error('Error updating health policy:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
