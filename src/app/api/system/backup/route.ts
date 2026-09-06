import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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

    // Fetch all database collections
    const [
      users,
      roles,
      permissions,
      systemSettings,
      assetCategories,
      vendors,
      locations,
      assets,
      assetAssignments,
      assetMaintenanceLogs,
      licenses,
      licenseAssignments,
      itServices,
      tickets,
      ticketComments,
      documents,
      passwordEntries,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.role.findMany(),
      prisma.permission.findMany(),
      prisma.systemSetting.findMany(),
      prisma.assetCategory.findMany(),
      prisma.vendor.findMany(),
      prisma.location.findMany(),
      prisma.asset.findMany(),
      prisma.assetAssignment.findMany(),
      prisma.assetMaintenanceLog.findMany(),
      prisma.license.findMany(),
      prisma.licenseAssignment.findMany(),
      prisma.iTService.findMany(),
      prisma.ticket.findMany(),
      prisma.ticketComment.findMany(),
      prisma.document.findMany(),
      prisma.passwordEntry.findMany(),
    ]);

    const backupData = {
      meta: {
        system: 'IT Asset & Service Management System',
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.email,
        totalCounts: {
          assets: assets.length,
          licenses: licenses.length,
          services: itServices.length,
          passwords: passwordEntries.length,
          tickets: tickets.length,
          users: users.length,
          documents: documents.length,
        },
      },
      data: {
        systemSettings,
        roles,
        permissions,
        users,
        assetCategories,
        vendors,
        locations,
        assets,
        assetAssignments,
        assetMaintenanceLogs,
        licenses,
        licenseAssignments,
        itServices,
        tickets,
        ticketComments,
        documents,
        passwordEntries,
      },
    };

    await createAuditLog({
      action: 'EXPORT' as any,
      entityType: 'System',
      entityId: 'backup',
      userId: currentUser.userId,
      changes: { totalEntities: Object.values(backupData.meta.totalCounts).reduce((a, b) => a + b, 0) },
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
  } catch (error) {
    console.error('Backup system error:', error);
    return NextResponse.json({ error: 'Failed to generate system backup' }, { status: 500 });
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

    if (!backupData || !backupData.systemSettings) {
      return NextResponse.json({ error: 'File sao lưu không đúng định dạng chuẩn ITSM' }, { status: 400 });
    }

    let restoredCounts = {
      settings: 0,
      categories: 0,
      vendors: 0,
      locations: 0,
      assets: 0,
      licenses: 0,
      services: 0,
      passwords: 0,
      tickets: 0,
      documents: 0,
    };

    // 1. System Settings
    if (Array.isArray(backupData.systemSettings)) {
      for (const s of backupData.systemSettings) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, label: s.label, description: s.description, group: s.group || 'general' },
          create: s,
        });
        restoredCounts.settings++;
      }
    }

    // 2. Categories
    if (Array.isArray(backupData.assetCategories)) {
      for (const cat of backupData.assetCategories) {
        await prisma.assetCategory.upsert({
          where: { id: cat.id },
          update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder, parentId: cat.parentId || null },
          create: cat,
        });
        restoredCounts.categories++;
      }
    }

    // 3. Vendors & Locations
    if (Array.isArray(backupData.vendors)) {
      for (const v of backupData.vendors) {
        await prisma.vendor.upsert({
          where: { id: v.id },
          update: { name: v.name, contactPerson: v.contactPerson, phone: v.phone, email: v.email },
          create: v,
        });
        restoredCounts.vendors++;
      }
    }

    if (Array.isArray(backupData.locations)) {
      for (const loc of backupData.locations) {
        await prisma.location.upsert({
          where: { id: loc.id },
          update: { name: loc.name, building: loc.building, floor: loc.floor },
          create: loc,
        });
        restoredCounts.locations++;
      }
    }

    // 4. Assets
    if (Array.isArray(backupData.assets)) {
      for (const a of backupData.assets) {
        const { category, vendor, location, assignments, maintenanceLogs, licenseAssignments, ...assetPayload } = a;
        await prisma.asset.upsert({
          where: { id: a.id },
          update: assetPayload,
          create: assetPayload,
        });
        restoredCounts.assets++;
      }
    }

    // 5. Asset Assignments
    if (Array.isArray(backupData.assetAssignments)) {
      for (const asg of backupData.assetAssignments) {
        const { asset, user, assignedBy, ...asgPayload } = asg;
        await prisma.assetAssignment.upsert({
          where: { id: asg.id },
          update: asgPayload,
          create: asgPayload,
        });
      }
    }

    // 6. Licenses
    if (Array.isArray(backupData.licenses)) {
      for (const lic of backupData.licenses) {
        const { vendor, assignments, ...licPayload } = lic;
        await prisma.license.upsert({
          where: { id: lic.id },
          update: licPayload,
          create: licPayload,
        });
        restoredCounts.licenses++;
      }
    }

    // 7. License Assignments
    if (Array.isArray(backupData.licenseAssignments)) {
      for (const lasg of backupData.licenseAssignments) {
        const { license, user, asset, assignedBy, ...lasgPayload } = lasg;
        await prisma.licenseAssignment.upsert({
          where: { id: lasg.id },
          update: lasgPayload,
          create: lasgPayload,
        });
      }
    }

    // 8. IT Services
    if (Array.isArray(backupData.itServices)) {
      for (const srv of backupData.itServices) {
        const { vendor, ...srvPayload } = srv;
        await prisma.iTService.upsert({
          where: { id: srv.id },
          update: srvPayload,
          create: srvPayload,
        });
        restoredCounts.services++;
      }
    }

    // 9. Passwords (KeePass)
    if (Array.isArray(backupData.passwordEntries)) {
      for (const p of backupData.passwordEntries) {
        await prisma.passwordEntry.upsert({
          where: { id: p.id },
          update: p,
          create: p,
        });
        restoredCounts.passwords++;
      }
    }

    // 10. Tickets
    if (Array.isArray(backupData.tickets)) {
      for (const t of backupData.tickets) {
        const { comments, ...ticketPayload } = t;
        await prisma.ticket.upsert({
          where: { id: t.id },
          update: ticketPayload,
          create: ticketPayload,
        });
        restoredCounts.tickets++;
      }
    }

    // 11. Documents
    if (Array.isArray(backupData.documents)) {
      for (const d of backupData.documents) {
        await prisma.document.upsert({
          where: { id: d.id },
          update: d,
          create: d,
        });
        restoredCounts.documents++;
      }
    }

    await createAuditLog({
      action: 'IMPORT',
      entityType: 'System',
      entityId: 'restore',
      userId: currentUser.userId,
      changes: { restoredCounts },
    });

    const totalRestored = Object.values(restoredCounts).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      message: `Phục hồi hoàn tất ${totalRestored} bản ghi (Tài sản: ${restoredCounts.assets}, Bản quyền: ${restoredCounts.licenses}, Mật khẩu: ${restoredCounts.passwords}, Dịch vụ: ${restoredCounts.services}, Tickets: ${restoredCounts.tickets})!`,
      restoredCounts,
    });
  } catch (error: any) {
    console.error('Restore system error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi dữ liệu từ file backup: ' + error.message }, { status: 500 });
  }
}
