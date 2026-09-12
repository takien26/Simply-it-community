import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';

let settingsCache: { timestamp: number; data: any } | null = null;
const SETTINGS_CACHE_TTL_MS = 60 * 1000; // 60 seconds cache

export async function GET() {
  try {
    if (settingsCache && Date.now() - settingsCache.timestamp < SETTINGS_CACHE_TTL_MS) {
      return NextResponse.json(settingsCache.data);
    }

    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
    const payload = { success: true, data: settings, settings };
    settingsCache = { timestamp: Date.now(), data: payload };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  settingsCache = null; // Invalidate cache on update
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canUpdate = await hasPermission(currentUser.userId, 'settings.update');
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    let settingsToSave: Array<{ key: string; value: string; group?: string; label?: string; type?: any }> = [];

    if (body.settings && Array.isArray(body.settings)) {
      settingsToSave = body.settings;
    } else if (Array.isArray(body)) {
      settingsToSave = body;
    } else if (body.key) {
      settingsToSave = [body];
    } else {
      return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
    }

    for (const item of settingsToSave) {
      if (!item.key) continue;
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: {
          value: item.value,
          ...(item.group ? { group: item.group } : {}),
          ...(item.label ? { label: item.label } : {}),
        },
        create: {
          key: item.key,
          value: item.value || '',
          label: item.label || item.key,
          group: item.group || 'general',
          type: item.type || 'STRING',
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Đã lưu cài đặt thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update settings' }, { status: 500 });
  }
}
