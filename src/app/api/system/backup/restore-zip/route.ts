import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import fs from 'fs';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const JSZip = require('jszip');

export const dynamic = 'force-dynamic';

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

      // Skip macOS metadata and other system entries
      if (
        cleanPath.includes('__MACOSX/') ||
        cleanPath.endsWith('.DS_Store') ||
        cleanPath === 'manifest.json' ||
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
      changes: { extractedFilesCount, extractedBytes },
    });

    const sizeFormatted = (extractedBytes / (1024 * 1024)).toFixed(2) + ' MB';

    return NextResponse.json({
      success: true,
      message: `Đã nhập và giải nén thành công ${extractedFilesCount} tệp tin (${sizeFormatted}) vào kho tài liệu máy chủ (/public/uploads)!`,
      extractedFilesCount,
      sizeFormatted,
      skippedFiles: skippedFiles.length > 0 ? skippedFiles : undefined,
    });
  } catch (error: any) {
    console.error('Restore ZIP error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi file từ gói ZIP: ' + (error?.message || error) }, { status: 500 });
  }
}
