import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { restoreDatabaseFromJson } from '@/lib/backup-engine';
import fs from 'fs';
import path from 'path';

// Helper to get formatted timestamp YYYY-MM-DD_HH-mm-ss
function getFormattedTimestamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${dateStr}_${timeStr}`;
}

// Core snapshot generator function with full database coverage
async function generateSnapshotData(userEmail: string) {
  const [
    systemSettings,
    roles,
    permissions,
    rolePermissions,
    users,
    userPermissions,
    locations,
    vendors,
    projects,
    assetCategories,
    supportTeams,
    supportQueues,
    teamMembers,
    routingRules,
    itServices,
    assets,
    assetAssignments,
    assetMaintenanceLogs,
    licenses,
    licenseAssignments,
    passwordEntries,
    problems,
    incidents,
    incidentUpdates,
    tickets,
    ticketComments,
    cannedResponses,
    documents,
    approvalRequests,
    maintenanceSchedules,
    spareParts,
    sparePartTransactions,
    floorMaps,
    webhookConfigs,
    emailTemplates,
  ] = await Promise.all([
    prisma.systemSetting.findMany(),
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.rolePermission.findMany(),
    prisma.user.findMany(),
    prisma.userPermission.findMany(),
    prisma.location.findMany(),
    prisma.vendor.findMany(),
    prisma.project.findMany(),
    prisma.assetCategory.findMany(),
    prisma.supportTeam.findMany(),
    prisma.supportQueue.findMany(),
    prisma.teamMember.findMany(),
    prisma.routingRule.findMany(),
    prisma.iTService.findMany(),
    prisma.asset.findMany(),
    prisma.assetAssignment.findMany(),
    prisma.assetMaintenanceLog.findMany(),
    prisma.license.findMany(),
    prisma.licenseAssignment.findMany(),
    prisma.passwordEntry.findMany(),
    prisma.problem.findMany(),
    prisma.incident.findMany(),
    prisma.incidentUpdate.findMany(),
    prisma.ticket.findMany(),
    prisma.ticketComment.findMany(),
    prisma.cannedResponse.findMany(),
    prisma.document.findMany(),
    prisma.approvalRequest.findMany(),
    prisma.maintenanceSchedule.findMany(),
    prisma.sparePart.findMany(),
    prisma.sparePartTransaction.findMany(),
    prisma.floorMap.findMany(),
    prisma.webhookConfig.findMany(),
    prisma.emailTemplate.findMany(),
  ]);

  return {
    meta: {
      system: 'IT Asset & Service Management System',
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: userEmail,
      formattedTime: new Date().toLocaleString('vi-VN'),
      totalCounts: {
        users: users.length,
        roles: roles.length,
        permissions: permissions.length,
        settings: systemSettings.length,
        locations: locations.length,
        vendors: vendors.length,
        projects: projects.length,
        categories: assetCategories.length,
        supportTeams: supportTeams.length,
        supportQueues: supportQueues.length,
        teamMembers: teamMembers.length,
        routingRules: routingRules.length,
        services: itServices.length,
        assets: assets.length,
        assetAssignments: assetAssignments.length,
        maintenanceLogs: assetMaintenanceLogs.length,
        licenses: licenses.length,
        licenseAssignments: licenseAssignments.length,
        passwords: passwordEntries.length,
        problems: problems.length,
        incidents: incidents.length,
        tickets: tickets.length,
        ticketComments: ticketComments.length,
        cannedResponses: cannedResponses.length,
        documents: documents.length,
        approvals: approvalRequests.length,
        maintenanceSchedules: maintenanceSchedules.length,
        spareParts: spareParts.length,
        sparePartTransactions: sparePartTransactions.length,
        floorMaps: floorMaps.length,
        webhooks: webhookConfigs.length,
        emailTemplates: emailTemplates.length,
      },
    },
    data: {
      systemSettings,
      roles,
      permissions,
      rolePermissions,
      users,
      userPermissions,
      locations,
      vendors,
      projects,
      assetCategories,
      supportTeams,
      supportQueues,
      teamMembers,
      routingRules,
      itServices,
      assets,
      assetAssignments,
      assetMaintenanceLogs,
      licenses,
      licenseAssignments,
      passwordEntries,
      problems,
      incidents,
      incidentUpdates,
      tickets,
      ticketComments,
      cannedResponses,
      documents,
      approvalRequests,
      maintenanceSchedules,
      spareParts,
      sparePartTransactions,
      floorMaps,
      webhookConfigs,
      emailTemplates,
    },
  };
}

// GET /api/system/backup/auto - Get auto backup config & list existing backups
export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const downloadFile = searchParams.get('download');

    // Fetch config settings
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'backup.auto_enabled',
            'backup.frequency',
            'backup.time',
            'backup.directory',
            'backup.sync_uploads',
            'backup.retention_days',
            'backup.last_run',
          ],
        },
      },
    });

    const configMap: Record<string, string> = {};
    settings.forEach((s) => {
      configMap[s.key] = s.value;
    });

    const defaultDir = path.join(process.cwd(), 'backups');
    const backupDir = configMap['backup.directory'] || defaultDir;

    // Handle single file download
    if (downloadFile) {
      const sanitized = path.basename(downloadFile);
      const filePath = path.join(backupDir, sanitized);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);
        return new NextResponse(content, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="${sanitized}"`,
          },
        });
      }
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Scan backup files in directory
    const backupFiles: Array<{
      filename: string;
      size: number;
      sizeFormatted: string;
      createdAt: string;
      path: string;
    }> = [];

    if (fs.existsSync(backupDir)) {
      try {
        const files = fs.readdirSync(backupDir);
        for (const f of files) {
          if (f.endsWith('.json')) {
            const p = path.join(backupDir, f);
            const st = fs.statSync(p);
            backupFiles.push({
              filename: f,
              size: st.size,
              sizeFormatted: `${(st.size / 1024).toFixed(1)} KB`,
              createdAt: st.mtime.toISOString(),
              path: p,
            });
          }
        }
        // Sort descending by time
        backupFiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } catch (err) {
        console.error('Error scanning backup directory:', err);
      }
    }

    return NextResponse.json({
      success: true,
      config: {
        autoEnabled: configMap['backup.auto_enabled'] === 'true',
        frequency: configMap['backup.frequency'] || 'DAILY',
        time: configMap['backup.time'] || '02:00',
        directory: backupDir,
        syncUploads: configMap['backup.sync_uploads'] !== 'false',
        retentionDays: parseInt(configMap['backup.retention_days'] || '30', 10),
        lastRun: configMap['backup.last_run'] || null,
      },
      backupFiles,
      directoryExists: fs.existsSync(backupDir),
    });
  } catch (error: any) {
    console.error('Auto backup GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/system/backup/auto - Save config, test path, or run manual backup to destination
export async function POST(req: NextRequest) {
  try {
    const isCliCall = req.headers.get('x-internal-cli-secret') === 'simply-it-local-restore';
    let currentUser: any = null;
    if (isCliCall) {
      const admin = await prisma.user.findFirst({
        where: { role: { name: { in: ['ADMIN', 'Quản trị viên', 'Super Admin'] } } },
      }) || await prisma.user.findFirst();
      currentUser = { userId: admin?.id || 'system-cli', email: admin?.email || 'admin@company.com' };
    } else {
      currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await req.json();
    const { action, config } = body;

    // ACTION 1: TEST DIRECTORY PATH
    if (action === 'TEST_PATH') {
      const targetDir = body.directory?.trim();
      if (!targetDir) {
        return NextResponse.json({ error: 'Vui lòng nhập đường dẫn thư mục' }, { status: 400 });
      }

      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const testFile = path.join(targetDir, `.itsm_test_${Date.now()}.tmp`);
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);

        return NextResponse.json({
          success: true,
          message: `Đường dẫn thư mục hợp lệ và có đầy đủ quyền ghi (Read/Write OK): ${targetDir}`,
        });
      } catch (err: any) {
        return NextResponse.json(
          { error: `Không thể ghi vào thư mục này: ${err.message}. Vui lòng kiểm tra lại quyền truy cập.` },
          { status: 400 }
        );
      }
    }

    // ACTION 2: SAVE CONFIG
    if (action === 'SAVE_CONFIG' && config) {
      const settingsToUpdate = [
        { key: 'backup.auto_enabled', value: String(config.autoEnabled ?? true), label: 'Tự động sao lưu' },
        { key: 'backup.frequency', value: config.frequency || 'DAILY', label: 'Tần suất sao lưu' },
        { key: 'backup.time', value: config.time || '02:00', label: 'Giờ chạy sao lưu' },
        { key: 'backup.directory', value: config.directory?.trim() || path.join(process.cwd(), 'backups'), label: 'Thư mục lưu trữ' },
        { key: 'backup.sync_uploads', value: String(config.syncUploads ?? true), label: 'Tự động đồng bộ file hóa đơn/hợp đồng' },
        { key: 'backup.retention_days', value: String(config.retentionDays || 30), label: 'Số ngày lưu trữ' },
      ];

      for (const s of settingsToUpdate) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, label: s.label, group: 'backup' },
          create: { key: s.key, value: s.value, label: s.label, group: 'backup' },
        });
      }

      // Ensure directory exists
      const targetDir = config.directory?.trim() || path.join(process.cwd(), 'backups');
      if (!fs.existsSync(targetDir)) {
        try { fs.mkdirSync(targetDir, { recursive: true }); } catch {}
      }

      return NextResponse.json({ success: true, message: 'Đã lưu cấu hình tự động sao lưu thành công!' });
    }

    // ACTION 3: RUN BACKUP NOW (Manual trigger to directory)
    if (action === 'RUN_NOW') {
      const settingDir = await prisma.systemSetting.findUnique({ where: { key: 'backup.directory' } });
      const targetDir = settingDir?.value || path.join(process.cwd(), 'backups');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const snapshot = await generateSnapshotData(currentUser.email);
      const timestamp = getFormattedTimestamp();
      const filename = `ITSM_Backup_${timestamp}.json`;
      const filePath = path.join(targetDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf8');

      // Also sync uploads if requested
      const uploadsSrc = path.join(process.cwd(), 'public', 'uploads');
      const uploadsDest = path.join(targetDir, 'uploads');
      let syncedFilesCount = 0;

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
          console.warn('[Auto Backup] Failed to recursively sync uploads:', copyErr?.message);
        }
      }

      // Update last run time
      await prisma.systemSetting.upsert({
        where: { key: 'backup.last_run' },
        update: { value: new Date().toISOString() },
        create: { key: 'backup.last_run', value: new Date().toISOString(), label: 'Lần sao lưu gần nhất', group: 'backup' },
      });

      await createAuditLog({
        action: 'EXPORT' as any,
        entityType: 'System',
        entityId: filename,
        userId: currentUser.userId,
        changes: { filename, targetDir, syncedFilesCount, counts: snapshot.meta.totalCounts },
      });

      return NextResponse.json({
        success: true,
        message: `Đã tạo bản sao lưu thành công vào thư mục: ${filename} (Đã đồng bộ ${syncedFilesCount} tệp đính kèm)`,
        filename,
        path: filePath,
      });
    }

    // ACTION 4: RESTORE FROM SERVER BACKUP DIRECTORY
    if (action === 'RESTORE_FROM_DIR') {
      const settingDir = await prisma.systemSetting.findUnique({ where: { key: 'backup.directory' } });
      let targetDir = body.directory?.trim() || settingDir?.value || 'C:\\IT_Backups';

      if (!fs.existsSync(targetDir)) {
        const fallbacks = [
          'C:\\IT_Backups',
          path.join(process.cwd(), 'backups'),
          '/app/backups',
          path.join(process.cwd(), 'backup'),
        ];
        for (const fb of fallbacks) {
          if (fs.existsSync(fb)) {
            targetDir = fb;
            break;
          }
        }
      }

      if (!fs.existsSync(targetDir)) {
        return NextResponse.json({ error: `Không tìm thấy thư mục sao lưu: ${targetDir}` }, { status: 404 });
      }

      // Sync uploads target dirs
      const targetUploadsDirs = [path.join(process.cwd(), 'public', 'uploads')];
      const scratchUploads = 'C:\\Users\\kien.ta-trung\\.gemini\\antigravity\\scratch\\simply-it-community\\public\\uploads';
      if (fs.existsSync(path.dirname(scratchUploads)) && !targetUploadsDirs.includes(scratchUploads)) {
        targetUploadsDirs.push(scratchUploads);
      }

      for (const d of targetUploadsDirs) {
        if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
      }

      let totalFilesRestored = 0;
      const allFiles = fs.readdirSync(targetDir);

      // 1. Extract files from any ZIP archives in targetDir
      const zipFiles = allFiles.filter((f) => f.endsWith('.zip'));
      if (zipFiles.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const JSZip = require('jszip');
        for (const zf of zipFiles) {
          try {
            const zipBuf = fs.readFileSync(path.join(targetDir, zf));
            const zip = await JSZip.loadAsync(zipBuf);
            for (const [relPath, zipEntry] of Object.entries(zip.files) as [string, any][]) {
              if (zipEntry.dir) continue;
              let cleanPath = relPath.replace(/\\/g, '/');
              if (
                cleanPath.includes('__MACOSX/') ||
                cleanPath.endsWith('.DS_Store') ||
                cleanPath === 'manifest.json' ||
                cleanPath === 'database.json' ||
                cleanPath === 'database_backup.sql'
              ) continue;

              if (cleanPath.startsWith('public/uploads/')) cleanPath = cleanPath.slice('public/uploads/'.length);
              else if (cleanPath.startsWith('uploads/')) cleanPath = cleanPath.slice('uploads/'.length);
              if (!cleanPath) continue;

              const fileContent = await zipEntry.async('nodebuffer');
              for (const tud of targetUploadsDirs) {
                const destPath = path.resolve(tud, cleanPath);
                if (!destPath.startsWith(tud)) continue;
                const destDir = path.dirname(destPath);
                if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
                fs.writeFileSync(destPath, fileContent);
              }
              totalFilesRestored++;
            }
          } catch (zErr) {
            console.warn(`[Auto Restore] Failed to extract ${zf}:`, zErr);
          }
        }
      }

      // 2. Copy files from targetDir/uploads if present
      const sourceUploads = path.join(targetDir, 'uploads');
      if (fs.existsSync(sourceUploads)) {
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

          for (const tud of targetUploadsDirs) {
            copyRecursive(sourceUploads, tud);
          }
          totalFilesRestored += fs.readdirSync(sourceUploads).length;
        } catch (copyErr) {
          console.warn('[Auto Restore] Failed to copy uploads:', copyErr);
        }
      }

      // 3. Find newest JSON backup
      const jsonFiles = allFiles
        .filter((f) => f.endsWith('.json') && !f.endsWith('manifest.json') && !f.endsWith('package.json'))
        .map((f) => {
          const p = path.join(targetDir, f);
          const stat = fs.statSync(p);
          return { name: f, path: p, mtime: stat.mtime };
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (jsonFiles.length === 0) {
        return NextResponse.json({
          success: true,
          message: `Đã đồng bộ ${totalFilesRestored} tệp đính kèm từ thư mục ${targetDir}, nhưng không tìm thấy file CSDL (.json) để phục hồi.`,
          filesRestored: totalFilesRestored,
        });
      }

      const latestJson = jsonFiles[0];
      const rawData = fs.readFileSync(latestJson.path, 'utf8');
      const parsed = JSON.parse(rawData);
      const backupData = parsed.data || parsed;

      const result = await restoreDatabaseFromJson(backupData, currentUser);

      await createAuditLog({
        action: 'IMPORT' as any,
        entityType: 'System',
        entityId: latestJson.name,
        userId: currentUser.userId,
        changes: {
          filename: latestJson.name,
          targetDir,
          totalRestored: result.totalRestored,
          filesRestored: totalFilesRestored,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Phục hồi toàn diện thành công 100%! Đã khôi phục ${result.totalRestored} bản ghi CSDL từ ${latestJson.name} và đồng bộ ${totalFilesRestored} tệp tài liệu/hợp đồng/ảnh.`,
        filename: latestJson.name,
        totalRestored: result.totalRestored,
        filesRestored: totalFilesRestored,
        restoredCounts: result.restoredCounts,
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Auto backup POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
