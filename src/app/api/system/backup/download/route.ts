import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for big backups

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Role check: Only Admin, Asset Manager, or user with settings.backup or settings.view
    const user = await prisma.user.findUnique({
      where: { id: currentUser.userId },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    const roleName = user?.role?.name || '';
    const permissions = user?.role?.permissions.map((p) => p.permission.code) || [];
    const isAllowed =
      roleName === 'Admin' ||
      roleName === 'Asset Manager' ||
      roleName.toLowerCase().includes('admin') ||
      permissions.includes('settings.backup') ||
      permissions.includes('settings.view') ||
      permissions.includes('*');

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Bạn không có quyền thực hiện sao lưu toàn bộ hệ thống.' },
        { status: 403 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const tempDir = os.tmpdir();
    const tempSqlFile = path.join(tempDir, `simply_db_${Date.now()}.sql`);
    const tempZipFile = path.join(tempDir, `SimplyIT_Backup_${timestamp}.zip`);

    // 1. Create SQL Database Dump
    let hasSqlDump = false;
    const pgDumpPaths = [
      'C:\\Program Files\\PostgreSQL\\18\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
      'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
      'pg_dump',
    ];

    let chosenPgDump: string | null = null;
    for (const p of pgDumpPaths) {
      if (p === 'pg_dump' || fs.existsSync(p)) {
        chosenPgDump = p;
        break;
      }
    }

    if (chosenPgDump) {
      try {
        const cmd = `"${chosenPgDump}" -h localhost -p 5432 -U postgres -d it_asset_db --clean --if-exists -f "${tempSqlFile}"`;
        await execAsync(cmd, {
          env: { ...process.env, PGPASSWORD: 'Admin@123' },
          timeout: 60000,
        });
        if (fs.existsSync(tempSqlFile) && fs.statSync(tempSqlFile).size > 0) {
          hasSqlDump = true;
        }
      } catch (dumpErr) {
        console.warn('pg_dump warning (fallback to json export):', dumpErr);
      }
    }

    // 2. Fetch counts & manifest info
    const [assetCount, licenseCount, serviceCount, ticketCount, userCount, vendorCount] =
      await Promise.all([
        prisma.asset.count(),
        prisma.license.count(),
        prisma.iTService.count(),
        prisma.ticket.count(),
        prisma.user.count(),
        prisma.vendor.count(),
      ]);

    // Record last backup in system settings or audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUser.userId,
        action: 'CREATE',
        entityType: 'SystemBackup',
        entityId: 'full_system_backup',
        changes: {
          timestamp: new Date().toISOString(),
          assets: assetCount,
          licenses: licenseCount,
          tickets: ticketCount,
          hasSqlDump,
        },
      },
    });

    const manifest = {
      appName: 'SIMPLY IT - Quản Trị Tài Sản & Dịch Vụ IT',
      version: '1.0.1',
      backupTime: new Date().toISOString(),
      performedBy: {
        name: user?.fullName || currentUser.email,
        email: currentUser.email,
        role: roleName,
      },
      database: {
        engine: 'PostgreSQL 18',
        dbName: 'it_asset_db',
        sqlDumpIncluded: hasSqlDump,
      },
      statistics: {
        totalAssets: assetCount,
        totalLicenses: licenseCount,
        totalServices: serviceCount,
        totalTickets: ticketCount,
        totalUsers: userCount,
        totalVendors: vendorCount,
      },
      contents: [
        hasSqlDump ? 'database_backup.sql (PostgreSQL Clean Dump)' : 'database_backup.sql (Not available)',
        'uploads/ (Tất cả ảnh hiện trạng thiết bị, hóa đơn, biên bản kiểm kê, tài liệu đính kèm)',
        'manifest.json (Thông tin chi tiết gói sao lưu)',
      ],
    };

    // 3. Compress into ZIP using archiver (supports v5 & v7)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const archiverPkg = require('archiver');
    const ArchiveClass = archiverPkg.ZipArchive || archiverPkg;
    const archive =
      typeof ArchiveClass === 'function' && ArchiveClass.prototype && ArchiveClass.prototype.pipe
        ? new ArchiveClass({ zlib: { level: 9 } })
        : archiverPkg('zip', { zlib: { level: 9 } });

    await new Promise<void>((resolve, reject) => {
      const output = fs.createWriteStream(tempZipFile);

      output.on('close', () => resolve());
      output.on('error', (err) => reject(err));
      archive.on('error', (err: any) => reject(err));

      archive.pipe(output);

      // Append SQL dump
      if (hasSqlDump && fs.existsSync(tempSqlFile)) {
        archive.file(tempSqlFile, { name: 'database_backup.sql' });
      }

      // Append manifest
      archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

      // Append entire public/uploads directory
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      if (fs.existsSync(uploadsDir)) {
        archive.directory(uploadsDir, 'uploads');
      }

      archive.finalize();
    });

    // Clean up temporary SQL file
    if (fs.existsSync(tempSqlFile)) {
      try {
        fs.unlinkSync(tempSqlFile);
      } catch {}
    }

    if (!fs.existsSync(tempZipFile)) {
      return NextResponse.json({ error: 'Không tạo được file sao lưu' }, { status: 500 });
    }

    const fileStat = fs.statSync(tempZipFile);
    const fileStream = fs.createReadStream(tempZipFile);

    // Stream the file directly
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => {
          controller.close();
          // Clean up temp zip file after sending
          setTimeout(() => {
            if (fs.existsSync(tempZipFile)) {
              try {
                fs.unlinkSync(tempZipFile);
              } catch {}
            }
          }, 10000);
        });
        fileStream.on('error', (err) => {
          controller.error(err);
          if (fs.existsSync(tempZipFile)) {
            try {
              fs.unlinkSync(tempZipFile);
            } catch {}
          }
        });
      },
    });

    const safeDate = new Date().toISOString().slice(0, 10);
    const filename = `SimplyIT_Full_Backup_${safeDate}_${Date.now()}.zip`;

    return new NextResponse(readableStream as any, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('System backup error:', error);
    return NextResponse.json(
      { error: error?.message || 'Lỗi khi tạo gói sao lưu hệ thống' },
      { status: 500 }
    );
  }
}
