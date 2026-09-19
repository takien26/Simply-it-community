import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateDatabaseBackupData } from '@/lib/backup-engine';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${dateStr}_${timeStr}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRun = searchParams.get('run') === 'true';

    // 1. Fetch system backup settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'backup.auto_enabled',
            'backup.directory',
            'backup.sync_uploads',
            'backup.retention_days',
            'backup.last_run',
          ],
        },
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s) => { config[s.key] = s.value; });

    const isAutoEnabled = config['backup.auto_enabled'] !== 'false';
    if (!isAutoEnabled && !forceRun) {
      return NextResponse.json({
        success: true,
        executed: false,
        message: 'Tự động sao lưu đang tạm dừng theo cấu hình',
      });
    }

    const targetDir = config['backup.directory'] || path.join(process.cwd(), 'backups');
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 2. Generate and write full database snapshot
    const snapshot = await generateDatabaseBackupData('system-daemon@cron');
    const timestamp = getFormattedTimestamp();
    const filename = `ITSM_Backup_${timestamp}.json`;
    const filePath = path.join(targetDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');
    const stat = fs.statSync(filePath);

    // 3. Sync uploads if enabled
    const syncUploads = config['backup.sync_uploads'] !== 'false';
    let syncedFilesCount = 0;
    if (syncUploads) {
      const uploadsSrc = path.join(process.cwd(), 'public', 'uploads');
      const uploadsDest = path.join(targetDir, 'uploads');
      if (fs.existsSync(uploadsSrc)) {
        if (!fs.existsSync(uploadsDest)) fs.mkdirSync(uploadsDest, { recursive: true });
        try {
          fs.cpSync(uploadsSrc, uploadsDest, { recursive: true });
          const countFiles = (dir: string): number => {
            let count = 0;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                count += countFiles(path.join(dir, entry.name));
              } else if (entry.isFile()) {
                count++;
              }
            }
            return count;
          };
          syncedFilesCount = countFiles(uploadsDest);
        } catch (copyErr: any) {
          console.warn('[Auto Backup Cron] Failed to recursively sync uploads:', copyErr?.message);
        }
      }
    }

    // 4. Retention cleanup (default 30 days)
    const retentionDays = parseInt(config['backup.retention_days'] || '30', 10);
    const retentionCutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let purgedFilesCount = 0;

    try {
      const files = fs.readdirSync(targetDir);
      for (const f of files) {
        if (f.startsWith('ITSM_Backup_') && f.endsWith('.json')) {
          const fullPath = path.join(targetDir, f);
          const fStat = fs.statSync(fullPath);
          if (fStat.mtimeMs < retentionCutoff) {
            fs.unlinkSync(fullPath);
            purgedFilesCount++;
          }
        }
      }
    } catch (cleanErr: any) {
      console.warn('[Auto Backup Cron] Retention cleanup warning:', cleanErr?.message);
    }

    // 5. Update last_run setting
    const nowIso = new Date().toISOString();
    await prisma.systemSetting.upsert({
      where: { key: 'backup.last_run' },
      update: { value: nowIso },
      create: { key: 'backup.last_run', value: nowIso, label: 'Lần sao lưu gần nhất', group: 'backup' },
    });

    return NextResponse.json({
      success: true,
      executed: true,
      message: `Sao lưu tự động thành công: ${filename}`,
      filename,
      sizeBytes: stat.size,
      syncedFilesCount,
      purgedFilesCount,
      targetDir,
    });
  } catch (error: any) {
    console.error('Auto backup cron error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
