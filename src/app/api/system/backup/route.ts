import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { generateDatabaseBackupData, restoreDatabaseFromJson } from '@/lib/backup-engine';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// GET /api/system/backup - Export complete database snapshot
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canBackup = (await hasPermission(currentUser.userId, 'settings.update')) || currentUser.roleName === 'Admin';
    if (!canBackup) {
      return NextResponse.json({ error: 'Forbidden: Missing admin permissions' }, { status: 403 });
    }

    const { backupData, totalRecords } = await generateDatabaseBackupData(currentUser.email);

    await createAuditLog({
      action: 'EXPORT' as any,
      entityType: 'System',
      entityId: 'backup',
      userId: currentUser.userId,
      changes: { totalEntities: totalRecords, counts: backupData.meta.totalCounts },
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `ITSM_Backup_${timestamp}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error('Backup system error:', error);
    return NextResponse.json({ error: 'Failed to generate system backup: ' + (error?.message || error) }, { status: 500 });
  }
}


// POST /api/system/backup - Restore complete database from backup JSON
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canRestore = (await hasPermission(currentUser.userId, 'settings.update')) || currentUser.roleName === 'Admin';
    if (!canRestore) {
      return NextResponse.json({ error: 'Forbidden: Missing admin permissions' }, { status: 403 });
    }

    const body = await req.json();
    const backupData = body.data || body;

    const result = await restoreDatabaseFromJson(backupData, currentUser);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Restore system error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi dữ liệu từ file backup: ' + (error?.message || error) }, { status: 500 });
  }
}
