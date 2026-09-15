import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { restoreZipBackupBuffer } from '@/lib/backup-engine';

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

    const result = await restoreZipBackupBuffer(buffer, currentUser);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Restore ZIP error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi file từ gói ZIP: ' + (error?.message || error) }, { status: 500 });
  }
}

