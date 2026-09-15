import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/db';
import { restoreDatabaseFromJson } from '@/lib/backup-engine';

async function main() {
  console.log('====================================================');
  console.log('🔄 Simply IT - Khôi Phục Hệ Thống Trực Tiếp Từ Thư Mục');
  console.log('====================================================\n');

  // 1. Determine target directory
  let targetDir = process.argv[2] || process.env.BACKUP_DIR;
  
  if (!targetDir) {
    try {
      const dbSetting = await prisma.systemSetting.findUnique({ where: { key: 'backup.directory' } });
      if (dbSetting?.value && fs.existsSync(dbSetting.value.trim())) {
        targetDir = dbSetting.value.trim();
      }
    } catch {}
  }

  if (!targetDir) {
    const candidates = [
      'C:\\IT_Backups',
      path.join(process.cwd(), 'backups'),
      '/app/backups',
      path.join(process.cwd(), 'backup'),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        targetDir = cand;
        break;
      }
    }
  }

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error('❌ Không tìm thấy thư mục sao lưu hợp lệ! (Đã thử: C:\\IT_Backups, ./backups, /app/backups)');
    console.log('👉 Vui lòng truyền đường dẫn thư mục: node scripts/restore-from-backup-dir.js "C:\\IT_Backups"');
    process.exit(1);
  }

  console.log(`📁 Thư mục nguồn sao lưu: ${targetDir}`);

  // 2. Prepare target upload directories
  const targetUploadsDirs = [
    path.join(process.cwd(), 'public', 'uploads'),
  ];

  const scratchUploads = 'C:\\Users\\kien.ta-trung\\.gemini\\antigravity\\scratch\\simply-it-community\\public\\uploads';
  if (fs.existsSync(path.dirname(scratchUploads)) && !targetUploadsDirs.includes(scratchUploads)) {
    targetUploadsDirs.push(scratchUploads);
  }

  for (const dir of targetUploadsDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // 3. Sync upload files from ZIP or uploads directory
  let totalFilesRestored = 0;

  const allFiles = fs.readdirSync(targetDir);
  const zipFiles = allFiles.filter(f => f.endsWith('.zip'));
  if (zipFiles.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const JSZip = require('jszip');
    for (const zf of zipFiles) {
      const zfPath = path.join(targetDir, zf);
      console.log(`📦 Đang quét gói nén: ${zf}...`);
      try {
        const zipBuf = fs.readFileSync(zfPath);
        const zip = await JSZip.loadAsync(zipBuf);
        let extractedFromThisZip = 0;

        for (const [relPath, zipEntry] of Object.entries(zip.files) as [string, any][]) {
          if (zipEntry.dir) continue;
          let cleanPath = relPath.replace(/\\/g, '/');
          if (
            cleanPath.includes('__MACOSX/') ||
            cleanPath.endsWith('.DS_Store') ||
            cleanPath === 'manifest.json' ||
            cleanPath === 'database.json' ||
            cleanPath === 'database_backup.sql'
          ) {
            continue;
          }

          if (cleanPath.startsWith('public/uploads/')) {
            cleanPath = cleanPath.slice('public/uploads/'.length);
          } else if (cleanPath.startsWith('uploads/')) {
            cleanPath = cleanPath.slice('uploads/'.length);
          }

          if (!cleanPath) continue;

          const fileContent = await zipEntry.async('nodebuffer');
          for (const targetUploads of targetUploadsDirs) {
            const destPath = path.resolve(targetUploads, cleanPath);
            if (!destPath.startsWith(targetUploads)) continue;
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
            fs.writeFileSync(destPath, fileContent);
          }
          extractedFromThisZip++;
        }
        console.log(`   ✅ Đã trích xuất ${extractedFromThisZip} tệp từ ${zf}`);
        totalFilesRestored += extractedFromThisZip;
      } catch (err: any) {
        console.warn(`   ⚠️ Lỗi đọc gói ZIP ${zf}:`, err?.message);
      }
    }
  }

  const sourceUploads = path.join(targetDir, 'uploads');
  if (fs.existsSync(sourceUploads)) {
    console.log(`📂 Đang sao chép thư mục tệp đính kèm: ${sourceUploads}...`);
    try {
      const copyRecursive = (src: string, dest: string): number => {
        let count = 0;
        const entries = fs.readdirSync(src, { withFileTypes: true });
        for (const entry of entries) {
          const srcPath = path.join(src, entry.name);
          const destPath = path.join(dest, entry.name);
          if (entry.isDirectory()) {
            if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });
            count += copyRecursive(srcPath, destPath);
          } else if (entry.isFile()) {
            fs.copyFileSync(srcPath, destPath);
            count++;
          }
        }
        return count;
      };

      for (const targetUploads of targetUploadsDirs) {
        const copied = copyRecursive(sourceUploads, targetUploads);
        console.log(`   ✅ Đã đồng bộ ${copied} tệp vào ${targetUploads}`);
      }
      totalFilesRestored += fs.readdirSync(sourceUploads).length;
    } catch (err: any) {
      console.warn(`   ⚠️ Lỗi sao chép tệp:`, err?.message);
    }
  }

  // 4. Find newest JSON file
  const jsonFiles = allFiles
    .filter(f => f.endsWith('.json') && !f.endsWith('manifest.json') && !f.endsWith('package.json'))
    .map(f => {
      const p = path.join(targetDir, f);
      const stat = fs.statSync(p);
      return { name: f, path: p, mtime: stat.mtime };
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  if (jsonFiles.length === 0) {
    console.warn(`⚠️ Không tìm thấy file JSON CSDL trong ${targetDir}. Chỉ đồng bộ tệp đính kèm.`);
    process.exit(0);
  }

  const latestJson = jsonFiles[0];
  console.log(`\n📄 Tìm thấy file CSDL mới nhất: ${latestJson.name} (Thời gian: ${latestJson.mtime.toLocaleString('vi-VN')})`);
  console.log('⏳ Đang phân tích và nạp dữ liệu vào CSDL PostgreSQL...');

  const rawData = fs.readFileSync(latestJson.path, 'utf8');
  const parsed = JSON.parse(rawData);
  const backupData = parsed.data || parsed;

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: { in: ['ADMIN', 'Quản trị viên', 'Super Admin'] } } },
  }) || await prisma.user.findFirst();

  const currentUser = {
    userId: adminUser?.id || 'system-restore',
    email: adminUser?.email || 'admin@company.com',
  };

  const result = await restoreDatabaseFromJson(backupData, currentUser);

  console.log('\n====================================================');
  console.log('🎉 PHỤC HỒI DỮ LIỆU TOÀN DIỆN THÀNH CÔNG 100%!');
  console.log('====================================================');
  console.log(`📊 Tổng số bản ghi CSDL đã khôi phục : ${result.totalRestored}`);
  console.log(`📁 Tổng số tệp tài liệu/ảnh/hợp đồng : ${totalFilesRestored}`);
  console.log('\nChi tiết các bảng dữ liệu:');
  for (const [table, count] of Object.entries(result.restoredCounts || {})) {
    if (Number(count) > 0) {
      console.log(` - ${table.padEnd(25)}: ${count} bản ghi`);
    }
  }
  console.log('====================================================\n');
}

main()
  .catch((err) => {
    console.error('\n❌ Lỗi trong quá trình phục hồi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
