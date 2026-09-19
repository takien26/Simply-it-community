import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = (formData.get('category') as string) || 'doc';

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    // Validate size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'Kích thước file vượt quá 25MB' }, { status: 400 });
    }

    const rawExt = path.extname(file.name) || '';
    const cleanExt = rawExt.toLowerCase();

    // Whitelist các định dạng file an toàn cho hệ thống tài liệu & tài sản IT
    const ALLOWED_EXTENSIONS = new Set([
      // Ảnh & Đồ họa (loại trừ .svg để ngăn ngừa Stored XSS)
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.ico',
      // Văn bản, Hợp đồng, Hóa đơn & Bảng tính Office
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.csv', '.txt', '.rtf',
      // File nén & sao lưu
      '.zip', '.rar', '.7z', '.tar', '.gz',
      // Dữ liệu cấu hình
      '.json', '.xml'
    ]);

    // Danh sách đen các định dạng thực thi nguy hiểm
    const DANGEROUS_EXTENSIONS = new Set([
      '.exe', '.bat', '.cmd', '.ps1', '.sh', '.vbs', '.js', '.mjs', '.cjs',
      '.php', '.phtml', '.php3', '.php4', '.php5', '.phps',
      '.cgi', '.pl', '.jar', '.msi', '.dll', '.com', '.scr', '.hta',
      '.vbe', '.wsf', '.wsh', '.reg', '.iso', '.bin'
    ]);

    if (!cleanExt || DANGEROUS_EXTENSIONS.has(cleanExt) || !ALLOWED_EXTENSIONS.has(cleanExt)) {
      return NextResponse.json(
        { error: `Định dạng file "${rawExt || 'không có phần mở rộng'}" không được phép tải lên vì lý do an toàn bảo mật.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const rawBaseName = path.basename(file.name, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeName = `${category}_${Date.now()}_${rawBaseName.slice(0, 40)}${cleanExt}`;
    const filePath = path.join(uploadDir, safeName);

    fs.writeFileSync(filePath, buffer);

    // Auto-sync new uploaded document/invoice to configured Backup Directory
    try {
      const backupDirSetting = await prisma.systemSetting.findUnique({ where: { key: 'backup.directory' } });
      const syncUploadsSetting = await prisma.systemSetting.findUnique({ where: { key: 'backup.sync_uploads' } });

      if (syncUploadsSetting?.value !== 'false') {
        const targetBackupDir = backupDirSetting?.value || path.join(process.cwd(), 'backups');
        const backupUploadsDir = path.join(targetBackupDir, 'uploads');
        if (!fs.existsSync(backupUploadsDir)) {
          fs.mkdirSync(backupUploadsDir, { recursive: true });
        }
        const backupFilePath = path.join(backupUploadsDir, safeName);
        fs.writeFileSync(backupFilePath, buffer);
      }
    } catch (syncErr) {
      console.warn('Auto backup file sync error (non-blocking):', syncErr);
    }

    const publicUrl = `/uploads/${safeName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      fileName: safeName,
      originalName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Tải file thất bại' }, { status: 500 });
  }
}

