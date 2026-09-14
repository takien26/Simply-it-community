import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { restoreZipBackupBuffer, restoreDatabaseFromJson } from '@/lib/backup-engine';

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

    const contentType = req.headers.get('content-type') || '';
    let buffer: Buffer;

    if (contentType.includes('multipart/form-data')) {
      try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (file) {
          const arrayBuffer = await file.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          const arrayBuffer = await req.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      } catch (formErr) {
        console.warn('req.formData() failed, falling back to req.arrayBuffer():', formErr);
        const arrayBuffer = await req.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      }
    } else {
      const arrayBuffer = await req.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json({ error: 'Tệp tải lên rỗng hoặc không hợp lệ' }, { status: 400 });
    }

    // Check magic bytes: ZIP starts with PK (0x50, 0x4B)
    if (buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4B) {
      const result = await restoreZipBackupBuffer(buffer, currentUser);
      return NextResponse.json(result);
    }

    // Check if JSON file format
    try {
      const text = buffer.toString('utf-8');
      const parsed = JSON.parse(text);
      const backupData = parsed.data || parsed;
      if (backupData && (backupData.users || backupData.assets || backupData.assetCategories || parsed.meta)) {
        const result = await restoreDatabaseFromJson(backupData, currentUser);
        return NextResponse.json(result);
      }
    } catch {}

    // Fallback to ZIP restore
    const result = await restoreZipBackupBuffer(buffer, currentUser);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Restore ZIP error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi file từ gói ZIP: ' + (error?.message || error) }, { status: 500 });
  }
}

