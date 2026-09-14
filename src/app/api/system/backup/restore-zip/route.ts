import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs';
import path from 'path';
import { restoreDatabaseFromJson } from '@/lib/backup-engine';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSZip = require('jszip');

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large restore

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

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn tệp .ZIP để phục hồi' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let zip: any;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (zipErr: any) {
      return NextResponse.json({ error: 'Tệp tải lên không phải là định dạng ZIP hợp lệ: ' + (zipErr?.message || zipErr) }, { status: 400 });
    }

    // 1. Check for database.json or any database snapshot in the ZIP archive
    let dbRestoreResult: any = null;
    let dbBackupFound = false;

    for (const [relPath, zipEntry] of Object.entries(zip.files) as [string, any][]) {
      if (zipEntry.dir) continue;
      const cleanPath = relPath.replace(/\\/g, '/');

      if (cleanPath === 'database.json' || (cleanPath.endsWith('.json') && !cleanPath.endsWith('manifest.json') && !cleanPath.includes('/'))) {
        try {
          const jsonText = await zipEntry.async('text');
          const parsed = JSON.parse(jsonText);
          const backupData = parsed.data || parsed;

          if (backupData && (backupData.users || backupData.assets || backupData.assetCategories || parsed.meta)) {
            dbBackupFound = true;
            dbRestoreResult = await restoreDatabaseFromJson(backupData, currentUser);
          }
        } catch (dbErr: any) {
          console.error('Lỗi khi phục hồi CSDL từ gói ZIP:', dbErr);
          dbRestoreResult = { success: false, error: dbErr?.message || String(dbErr) };
        }
        break;
      }
    }

    // 2. Extract media/upload files into public/uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    let extractedFilesCount = 0;
    let extractedBytes = 0;
    const skippedFiles: string[] = [];

    for (const [relPath, zipEntry] of Object.entries(zip.files) as [string, any][]) {
      if (zipEntry.dir) continue;

      let cleanPath = relPath.replace(/\\/g, '/');

      // Skip system metadata, SQL dump, manifest, and database snapshot (already processed)
      if (
        cleanPath.includes('__MACOSX/') ||
        cleanPath.endsWith('.DS_Store') ||
        cleanPath === 'manifest.json' ||
        cleanPath === 'database.json' ||
        cleanPath === 'database_backup.sql'
      ) {
        continue;
      }

      // If the entry starts with 'public/uploads/', strip it
      if (cleanPath.startsWith('public/uploads/')) {
        cleanPath = cleanPath.slice('public/uploads/'.length);
      } else if (cleanPath.startsWith('uploads/')) {
        cleanPath = cleanPath.slice('uploads/'.length);
      }

      if (!cleanPath) continue;

      // Prevent Zip Slip vulnerability
      const targetFilePath = path.resolve(uploadsDir, cleanPath);
      if (!targetFilePath.startsWith(uploadsDir)) {
        skippedFiles.push(cleanPath);
        continue;
      }

      const targetFileDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetFileDir)) {
        fs.mkdirSync(targetFileDir, { recursive: true });
      }

      const content = await zipEntry.async('nodebuffer');
      fs.writeFileSync(targetFilePath, content);

      extractedFilesCount++;
      extractedBytes += content.length;
    }

    await createAuditLog({
      action: 'IMPORT',
      entityType: 'System',
      entityId: 'restore-zip',
      userId: currentUser.userId,
      changes: {
        extractedFilesCount,
        extractedBytes,
        dbRestored: dbRestoreResult?.totalRestored || 0,
      },
    });

    const sizeFormatted = (extractedBytes / (1024 * 1024)).toFixed(2) + ' MB';

    let finalMessage = '';
    if (dbRestoreResult?.success) {
      finalMessage = `Phục hồi toàn diện thành công 100%! Đã khôi phục ${dbRestoreResult.totalRestored} bản ghi CSDL và đồng bộ ${extractedFilesCount} tệp tin tài liệu/ảnh/hóa đơn (${sizeFormatted}) vào hệ thống!`;
    } else if (dbBackupFound && !dbRestoreResult?.success) {
      finalMessage = `Đã đồng bộ ${extractedFilesCount} tệp tin (${sizeFormatted}), nhưng khôi phục CSDL gặp lỗi: ${dbRestoreResult?.error}`;
    } else {
      finalMessage = `Đã nhập và giải nén thành công ${extractedFilesCount} tệp tin (${sizeFormatted}) vào kho tài liệu máy chủ (/public/uploads)!`;
    }

    return NextResponse.json({
      success: true,
      message: finalMessage,
      extractedFilesCount,
      sizeFormatted,
      dbRestored: dbRestoreResult?.totalRestored || 0,
      restoredCounts: dbRestoreResult?.restoredCounts,
      skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
    });
  } catch (error: any) {
    console.error('Restore ZIP error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi file từ gói ZIP: ' + (error?.message || error) }, { status: 500 });
  }
}
