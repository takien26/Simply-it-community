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

    // Fetch ALL operational and configuration database collections
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

    const backupData = {
      meta: {
        system: 'IT Asset & Service Management System',
        version: '2.1.0',
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.email,
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

    const totalRecords = Object.values(backupData.meta.totalCounts).reduce((a, b) => a + b, 0);

    await createAuditLog({
      action: 'EXPORT' as any,
      entityType: 'System',
      entityId: 'backup',
      userId: currentUser.userId,
      changes: { totalEntities: totalRecords, counts: backupData.meta.totalCounts },
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
  } catch (error: any) {
    console.error('Backup system error:', error);
    return NextResponse.json({ error: 'Failed to generate system backup: ' + (error?.message || error) }, { status: 500 });
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

    if (!backupData || (!backupData.systemSettings && !backupData.users && !backupData.assets)) {
      return NextResponse.json({ error: 'File sao lưu không đúng định dạng chuẩn ITSM' }, { status: 400 });
    }

    const restoredCounts: Record<string, number> = {
      settings: 0,
      roles: 0,
      users: 0,
      locations: 0,
      vendors: 0,
      projects: 0,
      categories: 0,
      supportTeams: 0,
      supportQueues: 0,
      teamMembers: 0,
      routingRules: 0,
      services: 0,
      assets: 0,
      assetAssignments: 0,
      maintenanceLogs: 0,
      licenses: 0,
      licenseAssignments: 0,
      passwords: 0,
      problems: 0,
      incidents: 0,
      incidentUpdates: 0,
      tickets: 0,
      ticketComments: 0,
      cannedResponses: 0,
      documents: 0,
      approvals: 0,
      maintenanceSchedules: 0,
      spareParts: 0,
      sparePartTransactions: 0,
      floorMaps: 0,
      webhooks: 0,
      emailTemplates: 0,
    };

    // ID translation maps to preserve relations
    const roleIdMap = new Map<string, string>();
    const permissionIdMap = new Map<string, string>();
    const userIdMap = new Map<string, string>();
    const locationIdMap = new Map<string, string>();
    const vendorIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();
    const categoryIdMap = new Map<string, string>();
    const teamIdMap = new Map<string, string>();
    const queueIdMap = new Map<string, string>();
    const serviceIdMap = new Map<string, string>();
    const assetIdMap = new Map<string, string>();
    const licenseIdMap = new Map<string, string>();
    const problemIdMap = new Map<string, string>();
    const incidentIdMap = new Map<string, string>();
    const ticketIdMap = new Map<string, string>();
    const sparePartIdMap = new Map<string, string>();

    // 1. System Settings
    if (Array.isArray(backupData.systemSettings)) {
      for (const s of backupData.systemSettings) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, label: s.label, description: s.description, group: s.group || 'general' },
          create: { key: s.key, value: s.value, label: s.label, description: s.description, group: s.group || 'general' },
        });
        restoredCounts.settings++;
      }
    }

    // 2. Permissions
    if (Array.isArray(backupData.permissions)) {
      for (const p of backupData.permissions) {
        const existing = await prisma.permission.findFirst({
          where: { OR: [{ id: p.id }, { code: p.code }] },
        });
        if (existing) {
          permissionIdMap.set(p.id, existing.id);
          await prisma.permission.update({
            where: { id: existing.id },
            data: { name: p.name, module: p.module, description: p.description },
          });
        } else {
          const created = await prisma.permission.create({
            data: { id: p.id, code: p.code, name: p.name, module: p.module, description: p.description },
          });
          permissionIdMap.set(p.id, created.id);
        }
      }
    }

    // 3. Roles
    if (Array.isArray(backupData.roles)) {
      for (const r of backupData.roles) {
        const existing = await prisma.role.findFirst({
          where: { OR: [{ id: r.id }, { name: r.name }] },
        });
        if (existing) {
          roleIdMap.set(r.id, existing.id);
          await prisma.role.update({
            where: { id: existing.id },
            data: { description: r.description, isSystem: r.isSystem },
          });
        } else {
          const created = await prisma.role.create({
            data: { id: r.id, name: r.name, description: r.description, isSystem: Boolean(r.isSystem) },
          });
          roleIdMap.set(r.id, created.id);
        }
        restoredCounts.roles++;
      }
    }

    // 4. Role Permissions
    if (Array.isArray(backupData.rolePermissions)) {
      for (const rp of backupData.rolePermissions) {
        const targetRoleId = roleIdMap.get(rp.roleId) || rp.roleId;
        const targetPermissionId = permissionIdMap.get(rp.permissionId) || rp.permissionId;
        const rExists = await prisma.role.findUnique({ where: { id: targetRoleId } });
        const pExists = await prisma.permission.findUnique({ where: { id: targetPermissionId } });
        if (rExists && pExists) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId: targetRoleId, permissionId: targetPermissionId } },
            update: {},
            create: { roleId: targetRoleId, permissionId: targetPermissionId },
          });
        }
      }
    }

    // 5. Locations
    if (Array.isArray(backupData.locations)) {
      for (const loc of backupData.locations) {
        const existing = await prisma.location.findFirst({
          where: { OR: [{ id: loc.id }, { name: loc.name }] },
        });
        const locPayload = {
          name: loc.name,
          building: loc.building,
          floor: loc.floor,
          notes: loc.notes,
          isActive: loc.isActive !== undefined ? Boolean(loc.isActive) : true,
        };
        if (existing) {
          locationIdMap.set(loc.id, existing.id);
          await prisma.location.update({
            where: { id: existing.id },
            data: locPayload,
          });
        } else {
          const created = await prisma.location.create({
            data: { id: loc.id, ...locPayload },
          });
          locationIdMap.set(loc.id, created.id);
        }
        restoredCounts.locations++;
      }
    }

    // 6. Vendors
    if (Array.isArray(backupData.vendors)) {
      for (const v of backupData.vendors) {
        const existing = await prisma.vendor.findFirst({
          where: { OR: [{ id: v.id }, { name: v.name }] },
        });
        const vPayload = {
          name: v.name,
          contactName: v.contactName,
          email: v.email,
          phone: v.phone,
          address: v.address,
          website: v.website,
          taxCode: v.taxCode,
          notes: v.notes,
        };
        if (existing) {
          vendorIdMap.set(v.id, existing.id);
          await prisma.vendor.update({ where: { id: existing.id }, data: vPayload });
        } else {
          const created = await prisma.vendor.create({ data: { id: v.id, ...vPayload } });
          vendorIdMap.set(v.id, created.id);
        }
        restoredCounts.vendors++;
      }
    }

    // 7. Users (Nhân sự) - Pass 1: create / update basic fields
    if (Array.isArray(backupData.users)) {
      for (const u of backupData.users) {
        const targetRoleId = roleIdMap.get(u.roleId) || u.roleId;
        let role = await prisma.role.findUnique({ where: { id: targetRoleId } });
        if (!role) {
          role = (await prisma.role.findFirst({ where: { isSystem: true } })) || (await prisma.role.findFirst());
        }
        if (!role) continue;

        const targetLocId = u.locationId ? (locationIdMap.get(u.locationId) || u.locationId) : null;
        const locExists = targetLocId ? await prisma.location.findUnique({ where: { id: targetLocId } }) : null;

        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ id: u.id }, { email: u.email }] },
        });

        const userPayload = {
          fullName: u.fullName,
          roleId: role.id,
          department: u.department,
          position: u.position,
          companyName: u.companyName,
          phone: u.phone,
          avatarUrl: u.avatarUrl,
          locationId: locExists ? locExists.id : null,
          isActive: u.isActive !== undefined ? Boolean(u.isActive) : true,
          ...(u.secondaryPasswordHash ? { secondaryPasswordHash: u.secondaryPasswordHash } : {}),
        };

        if (existingUser) {
          userIdMap.set(u.id, existingUser.id);
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              ...userPayload,
              ...(u.passwordHash && !existingUser.passwordHash ? { passwordHash: u.passwordHash } : {}),
            },
          });
        } else {
          const created = await prisma.user.create({
            data: {
              id: u.id,
              email: u.email,
              passwordHash: u.passwordHash || '$2a$10$wE99q4X8V60X6K6sK6qEheFp1B2e4vE1o0c0h5rE1n2e3a4m5p6l',
              ...userPayload,
            },
          });
          userIdMap.set(u.id, created.id);
        }
        restoredCounts.users++;
      }

      // Users - Pass 2: link managerId
      for (const u of backupData.users) {
        if (u.managerId) {
          const curId = userIdMap.get(u.id) || u.id;
          const mgrId = userIdMap.get(u.managerId) || u.managerId;
          if (curId !== mgrId) {
            const mExists = await prisma.user.findUnique({ where: { id: mgrId } });
            if (mExists) {
              await prisma.user.update({ where: { id: curId }, data: { managerId: mgrId } });
            }
          }
        }
      }
    }

    // 8. User Permissions
    if (Array.isArray(backupData.userPermissions)) {
      for (const up of backupData.userPermissions) {
        const targetUserId = userIdMap.get(up.userId) || up.userId;
        const targetPermId = permissionIdMap.get(up.permissionId) || up.permissionId;
        const targetGrantedById = userIdMap.get(up.grantedById) || currentUser.userId;

        const uExists = await prisma.user.findUnique({ where: { id: targetUserId } });
        const pExists = await prisma.permission.findUnique({ where: { id: targetPermId } });
        const gExists = await prisma.user.findUnique({ where: { id: targetGrantedById } });

        if (uExists && pExists && gExists) {
          await prisma.userPermission.upsert({
            where: { userId_permissionId: { userId: targetUserId, permissionId: targetPermId } },
            update: { granted: Boolean(up.granted), grantedById: targetGrantedById },
            create: { userId: targetUserId, permissionId: targetPermId, granted: Boolean(up.granted), grantedById: targetGrantedById },
          });
        }
      }
    }

    // 9. Projects (Gói mua sắm / Dự án)
    if (Array.isArray(backupData.projects)) {
      for (const proj of backupData.projects) {
        const targetVendorId = proj.vendorId ? (vendorIdMap.get(proj.vendorId) || proj.vendorId) : null;
        const targetCreatedById = proj.createdById ? (userIdMap.get(proj.createdById) || proj.createdById) : null;

        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;
        const uExists = targetCreatedById ? await prisma.user.findUnique({ where: { id: targetCreatedById } }) : null;

        const existing = await prisma.project.findFirst({
          where: { OR: [{ id: proj.id }, { name: proj.name }] },
        });

        const payload = {
          name: proj.name,
          code: proj.code,
          companyName: proj.companyName,
          vendorId: vExists ? targetVendorId : null,
          description: proj.description,
          createdById: uExists ? targetCreatedById : null,
        };

        if (existing) {
          projectIdMap.set(proj.id, existing.id);
          await prisma.project.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.project.create({ data: { id: proj.id, ...payload } });
          projectIdMap.set(proj.id, created.id);
        }
        restoredCounts.projects++;
      }
    }

    // 10. Asset Categories (Tree-structure with @@unique([name, parentId]))
    if (Array.isArray(backupData.assetCategories)) {
      // Sort categories so parents (root nodes) are processed before children
      const sortedCategories: any[] = [];
      const remaining: any[] = [...backupData.assetCategories];

      // Pass A: Roots first (parentId is null, empty or undefined)
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (!remaining[i].parentId) {
          sortedCategories.push(remaining[i]);
          remaining.splice(i, 1);
        }
      }

      // Pass B: Breadth-first / multi-level children
      let progress = true;
      while (remaining.length > 0 && progress) {
        progress = false;
        for (let i = remaining.length - 1; i >= 0; i--) {
          const item = remaining[i];
          const parentProcessed = sortedCategories.some((s) => s.id === item.parentId);
          if (parentProcessed) {
            sortedCategories.push(item);
            remaining.splice(i, 1);
            progress = true;
          }
        }
      }
      // Any remaining items (orphaned / cycles) pushed at the end
      if (remaining.length > 0) {
        sortedCategories.push(...remaining);
      }

      for (const c of sortedCategories) {
        try {
          // Resolve target parentId
          let targetParentId: string | null = null;
          if (c.parentId) {
            const mappedParentId = categoryIdMap.get(c.parentId) || c.parentId;
            const parentInDb = await prisma.assetCategory.findUnique({ where: { id: mappedParentId } });
            if (parentInDb && parentInDb.id !== c.id) {
              targetParentId = parentInDb.id;
            }
          }

          // 1. Check if category already exists by ID
          const existingById = await prisma.assetCategory.findUnique({
            where: { id: c.id },
          });

          // 2. Check if a category with the SAME (name, parentId) already exists
          const existingByNameAndParent = await prisma.assetCategory.findFirst({
            where: {
              name: c.name,
              parentId: targetParentId,
            },
          });

          const cPayload: any = {
            name: c.name,
            description: c.description || null,
            icon: c.icon || null,
            parentId: targetParentId,
            sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : 0,
            isActive: c.isActive !== undefined ? Boolean(c.isActive) : true,
          };
          if (c.customFields) {
            cPayload.customFields = c.customFields;
          }

          if (existingByNameAndParent) {
            // Already has exact (name, parentId) match!
            // Map the backup ID to this existing category to prevent constraint collision
            categoryIdMap.set(c.id, existingByNameAndParent.id);
            // Safe to update non-unique metadata without changing name/parentId
            await prisma.assetCategory.update({
              where: { id: existingByNameAndParent.id },
              data: {
                description: c.description || existingByNameAndParent.description,
                icon: c.icon || existingByNameAndParent.icon,
                sortOrder: typeof c.sortOrder === 'number' ? c.sortOrder : existingByNameAndParent.sortOrder,
                isActive: c.isActive !== undefined ? Boolean(c.isActive) : existingByNameAndParent.isActive,
                ...(c.customFields ? { customFields: c.customFields } : {}),
              },
            });
          } else if (existingById) {
            // ID matches and no (name, parentId) conflict exists in DB
            categoryIdMap.set(c.id, existingById.id);
            await prisma.assetCategory.update({
              where: { id: existingById.id },
              data: cPayload,
            });
          } else {
            // Neither ID nor (name, parentId) exists: Create brand new record
            const created = await prisma.assetCategory.create({
              data: { id: c.id, ...cPayload },
            });
            categoryIdMap.set(c.id, created.id);
          }
          restoredCounts.categories++;
        } catch (catErr: any) {
          console.warn(`[Backup Restore] Category ${c.name} (${c.id}) notice:`, catErr?.message);
          // Resilient fallback: find any existing category by name or ID to map reference
          const fallback = await prisma.assetCategory.findFirst({
            where: { OR: [{ id: c.id }, { name: c.name }] },
          });
          if (fallback) {
            categoryIdMap.set(c.id, fallback.id);
          }
        }
      }
    }

    // 11. Support Teams (Tree-structure)
    if (Array.isArray(backupData.supportTeams)) {
      for (const st of backupData.supportTeams) {
        try {
          const existing = await prisma.supportTeam.findFirst({
            where: { OR: [{ id: st.id }, { code: st.code }] },
          });
          const payload = {
            name: st.name,
            code: st.code,
            description: st.description,
            companyScope: st.companyScope,
            locationScope: st.locationScope,
            isActive: st.isActive !== undefined ? Boolean(st.isActive) : true,
            sortOrder: st.sortOrder || 0,
          };
          if (existing) {
            teamIdMap.set(st.id, existing.id);
            await prisma.supportTeam.update({ where: { id: existing.id }, data: payload });
          } else {
            const created = await prisma.supportTeam.create({ data: { id: st.id, ...payload } });
            teamIdMap.set(st.id, created.id);
          }
          restoredCounts.supportTeams++;
        } catch (stErr: any) {
          console.warn(`[Backup Restore] Support team ${st.name} notice:`, stErr?.message);
        }
      }

      // Pass 2: parentId
      for (const st of backupData.supportTeams) {
        try {
          if (st.parentId) {
            const curId = teamIdMap.get(st.id) || st.id;
            const parId = teamIdMap.get(st.parentId) || st.parentId;
            if (curId !== parId) {
              const pExists = await prisma.supportTeam.findUnique({ where: { id: parId } });
              if (pExists) {
                await prisma.supportTeam.update({ where: { id: curId }, data: { parentId: parId } });
              }
            }
          }
        } catch (stParErr: any) {
          console.warn(`[Backup Restore] Support team parentId notice:`, stParErr?.message);
        }
      }
    }

    // 12. Support Queues
    if (Array.isArray(backupData.supportQueues)) {
      for (const sq of backupData.supportQueues) {
        const targetTeamId = teamIdMap.get(sq.teamId) || sq.teamId;
        const teamExists = await prisma.supportTeam.findUnique({ where: { id: targetTeamId } });
        if (!teamExists) continue;

        const existing = await prisma.supportQueue.findFirst({
          where: { OR: [{ id: sq.id }, { code: sq.code }] },
        });
        const payload = {
          name: sq.name,
          code: sq.code,
          teamId: targetTeamId,
          description: sq.description,
          isDefault: Boolean(sq.isDefault),
          isActive: sq.isActive !== undefined ? Boolean(sq.isActive) : true,
        };
        if (existing) {
          queueIdMap.set(sq.id, existing.id);
          await prisma.supportQueue.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.supportQueue.create({ data: { id: sq.id, ...payload } });
          queueIdMap.set(sq.id, created.id);
        }
        restoredCounts.supportQueues++;
      }
    }

    // 13. Team Members
    if (Array.isArray(backupData.teamMembers)) {
      for (const tm of backupData.teamMembers) {
        const targetTeamId = teamIdMap.get(tm.teamId) || tm.teamId;
        const targetUserId = userIdMap.get(tm.userId) || tm.userId;

        const tExists = await prisma.supportTeam.findUnique({ where: { id: targetTeamId } });
        const uExists = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!tExists || !uExists) continue;

        const payload = {
          role: tm.role || 'MEMBER',
          primarySkills: Array.isArray(tm.primarySkills) ? tm.primarySkills : [],
          secondarySkills: Array.isArray(tm.secondarySkills) ? tm.secondarySkills : [],
          supportedCompanies: Array.isArray(tm.supportedCompanies) ? tm.supportedCompanies : [],
          supportedLocations: Array.isArray(tm.supportedLocations) ? tm.supportedLocations : [],
          skillLevel: tm.skillLevel,
          maxTickets: tm.maxTickets || 20,
          isAvailable: tm.isAvailable !== undefined ? Boolean(tm.isAvailable) : true,
        };

        await prisma.teamMember.upsert({
          where: { teamId_userId: { teamId: targetTeamId, userId: targetUserId } },
          update: payload,
          create: { id: tm.id, teamId: targetTeamId, userId: targetUserId, ...payload },
        });
        restoredCounts.teamMembers++;
      }
    }

    // 14. Routing Rules
    if (Array.isArray(backupData.routingRules)) {
      for (const rr of backupData.routingRules) {
        const targetTeamId = teamIdMap.get(rr.targetTeamId || rr.teamId) || rr.targetTeamId || rr.teamId;
        const tExists = targetTeamId ? await prisma.supportTeam.findUnique({ where: { id: targetTeamId } }) : null;
        if (!tExists) continue;

        const targetUserId = rr.targetUserId ? (userIdMap.get(rr.targetUserId) || rr.targetUserId) : null;
        const uExists = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;

        const targetQueueId = rr.targetQueueId ? (queueIdMap.get(rr.targetQueueId) || rr.targetQueueId) : null;
        const qExists = targetQueueId ? await prisma.supportQueue.findUnique({ where: { id: targetQueueId } }) : null;

        const payload = {
          name: rr.name,
          description: rr.description,
          priority: rr.priority || 50,
          isActive: rr.isActive !== undefined ? Boolean(rr.isActive) : true,
          conditions: rr.conditions,
          targetTeamId: targetTeamId,
          targetQueueId: qExists ? targetQueueId : null,
          targetUserId: uExists ? targetUserId : null,
          autoAssign: Boolean(rr.autoAssign),
        };

        const existing = await prisma.routingRule.findUnique({ where: { id: rr.id } });
        if (existing) {
          await prisma.routingRule.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.routingRule.create({ data: { id: rr.id, ...payload } });
        }
        restoredCounts.routingRules++;
      }
    }

    // 15. IT Services
    if (Array.isArray(backupData.itServices)) {
      for (const srv of backupData.itServices) {
        const targetOwnerId = srv.ownerId ? (userIdMap.get(srv.ownerId) || srv.ownerId) : null;
        const uExists = targetOwnerId ? await prisma.user.findUnique({ where: { id: targetOwnerId } }) : null;

        const existingSrv = await prisma.iTService.findFirst({
          where: { OR: [{ id: srv.id }, ...(srv.serviceCode ? [{ serviceCode: srv.serviceCode }] : [])] },
        });

        const payload = {
          serviceCode: srv.serviceCode,
          name: srv.name,
          serviceType: srv.serviceType,
          status: srv.status,
          criticality: srv.criticality,
          description: srv.description,
          slaHours: srv.slaHours,
          ownerId: uExists ? targetOwnerId : null,
          companyName: srv.companyName,
          contractNumber: srv.contractNumber,
          invoiceNumber: srv.invoiceNumber,
          monthlyCost: srv.monthlyCost,
          annualCost: srv.annualCost,
          currency: srv.currency || 'VND',
          billingCycle: srv.billingCycle,
          startDate: srv.startDate ? new Date(srv.startDate) : null,
          renewalDate: srv.renewalDate ? new Date(srv.renewalDate) : null,
          notes: srv.notes,
        };

        if (existingSrv) {
          serviceIdMap.set(srv.id, existingSrv.id);
          await prisma.iTService.update({ where: { id: existingSrv.id }, data: payload });
        } else {
          const created = await prisma.iTService.create({ data: { id: srv.id, ...payload } });
          serviceIdMap.set(srv.id, created.id);
        }
        restoredCounts.services++;
      }
    }

    // 16. Assets
    if (Array.isArray(backupData.assets)) {
      for (const a of backupData.assets) {
        const targetCatId = categoryIdMap.get(a.categoryId) || a.categoryId;
        let catExists = await prisma.assetCategory.findUnique({ where: { id: targetCatId } });
        if (!catExists) {
          catExists = await prisma.assetCategory.findFirst();
        }
        if (!catExists) continue;

        const targetVendorId = a.vendorId ? (vendorIdMap.get(a.vendorId) || a.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const targetLocId = a.locationId ? (locationIdMap.get(a.locationId) || a.locationId) : null;
        const locExists = targetLocId ? await prisma.location.findUnique({ where: { id: targetLocId } }) : null;

        const targetUserId = a.assignedToId ? (userIdMap.get(a.assignedToId) || a.assignedToId) : null;
        const uExists = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;

        const payload = {
          assetTag: a.assetTag,
          name: a.name,
          categoryId: catExists.id,
          brand: a.brand,
          model: a.model,
          serialNumber: a.serialNumber,
          status: a.status,
          purchaseDate: a.purchaseDate ? new Date(a.purchaseDate) : null,
          purchasePrice: a.purchasePrice,
          purchaseCurrency: a.purchaseCurrency || 'VND',
          warrantyExpiry: a.warrantyExpiry ? new Date(a.warrantyExpiry) : null,
          vendorId: vExists ? targetVendorId : null,
          locationId: locExists ? targetLocId : null,
          assignedToId: uExists ? targetUserId : null,
          companyName: a.companyName,
          contractNumber: a.contractNumber,
          invoiceNumber: a.invoiceNumber,
          specs: a.specs,
          imageUrl: a.imageUrl,
          invoiceUrl: a.invoiceUrl,
          notes: a.notes,
        };

        const existingAsset = await prisma.asset.findFirst({
          where: { OR: [{ id: a.id }, { assetTag: a.assetTag }] },
        });

        if (existingAsset) {
          assetIdMap.set(a.id, existingAsset.id);
          await prisma.asset.update({ where: { id: existingAsset.id }, data: payload });
        } else {
          const created = await prisma.asset.create({ data: { id: a.id, ...payload } });
          assetIdMap.set(a.id, created.id);
        }
        restoredCounts.assets++;
      }
    }

    // 17. Asset Assignments
    if (Array.isArray(backupData.assetAssignments)) {
      for (const asg of backupData.assetAssignments) {
        const targetAssetId = assetIdMap.get(asg.assetId) || asg.assetId;
        const aExists = await prisma.asset.findUnique({ where: { id: targetAssetId } });
        if (!aExists) continue;

        const targetUserId = userIdMap.get(asg.userId) || asg.userId;
        const uExists = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!uExists) continue;

        const targetAssignedById = userIdMap.get(asg.assignedById) || currentUser.userId;
        const abExists = await prisma.user.findUnique({ where: { id: targetAssignedById } });

        const targetReturnedToId = asg.returnedToId ? (userIdMap.get(asg.returnedToId) || asg.returnedToId) : null;
        const rtExists = targetReturnedToId ? await prisma.user.findUnique({ where: { id: targetReturnedToId } }) : null;

        const payload = {
          assetId: targetAssetId,
          userId: targetUserId,
          assignedDate: asg.assignedDate ? new Date(asg.assignedDate) : new Date(),
          returnedDate: asg.returnedDate ? new Date(asg.returnedDate) : null,
          status: asg.status,
          assignedById: abExists ? targetAssignedById : currentUser.userId,
          returnedToId: rtExists ? targetReturnedToId : null,
          notes: asg.notes,
        };

        const existing = await prisma.assetAssignment.findUnique({ where: { id: asg.id } });
        if (existing) {
          await prisma.assetAssignment.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.assetAssignment.create({ data: { id: asg.id, ...payload } });
        }
        restoredCounts.assetAssignments++;
      }
    }

    // 18. Asset Maintenance Logs
    if (Array.isArray(backupData.assetMaintenanceLogs)) {
      for (const log of backupData.assetMaintenanceLogs) {
        const targetAssetId = assetIdMap.get(log.assetId) || log.assetId;
        const aExists = await prisma.asset.findUnique({ where: { id: targetAssetId } });
        if (!aExists) continue;

        const targetVendorId = log.vendorId ? (vendorIdMap.get(log.vendorId) || log.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const targetPerfId = log.performedById ? (userIdMap.get(log.performedById) || log.performedById) : null;
        const pExists = targetPerfId ? await prisma.user.findUnique({ where: { id: targetPerfId } }) : null;

        const payload = {
          assetId: targetAssetId,
          type: log.type || 'REPAIR',
          title: log.title || 'Bảo trì tài sản',
          description: log.description,
          performedById: pExists ? targetPerfId : null,
          vendorId: vExists ? targetVendorId : null,
          cost: log.cost,
          costCurrency: log.costCurrency || 'VND',
          performedAt: log.performedAt ? new Date(log.performedAt) : (log.startDate ? new Date(log.startDate) : new Date()),
          completedAt: log.completedAt ? new Date(log.completedAt) : (log.endDate ? new Date(log.endDate) : null),
          attachmentUrls: log.attachmentUrls,
          notes: log.notes,
        };

        const existing = await prisma.assetMaintenanceLog.findUnique({ where: { id: log.id } });
        if (existing) {
          await prisma.assetMaintenanceLog.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.assetMaintenanceLog.create({ data: { id: log.id, ...payload } });
        }
        restoredCounts.maintenanceLogs++;
      }
    }

    // 19. Licenses
    if (Array.isArray(backupData.licenses)) {
      for (const lic of backupData.licenses) {
        const targetVendorId = lic.vendorId ? (vendorIdMap.get(lic.vendorId) || lic.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const payload = {
          name: lic.name,
          licenseKey: lic.licenseKey,
          licenseType: lic.licenseType,
          totalSeats: lic.totalSeats || 1,
          vendorId: vExists ? targetVendorId : null,
          purchaseDate: lic.purchaseDate ? new Date(lic.purchaseDate) : null,
          expiryDate: lic.expiryDate ? new Date(lic.expiryDate) : null,
          purchasePrice: lic.purchasePrice,
          purchaseCurrency: lic.purchaseCurrency || 'VND',
          companyName: lic.companyName,
          contractNumber: lic.contractNumber,
          invoiceNumber: lic.invoiceNumber,
          invoiceUrl: lic.invoiceUrl,
          notes: lic.notes,
        };

        const existing = await prisma.license.findUnique({ where: { id: lic.id } });
        if (existing) {
          licenseIdMap.set(lic.id, existing.id);
          await prisma.license.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.license.create({ data: { id: lic.id, ...payload } });
          licenseIdMap.set(lic.id, created.id);
        }
        restoredCounts.licenses++;
      }
    }

    // 20. License Assignments
    if (Array.isArray(backupData.licenseAssignments)) {
      for (const la of backupData.licenseAssignments) {
        const targetLicId = licenseIdMap.get(la.licenseId) || la.licenseId;
        const lExists = await prisma.license.findUnique({ where: { id: targetLicId } });
        if (!lExists) continue;

        const targetUserId = la.userId ? (userIdMap.get(la.userId) || la.userId) : null;
        const uExists = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;

        const targetAssetId = la.assetId ? (assetIdMap.get(la.assetId) || la.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const targetAssignedById = userIdMap.get(la.assignedById) || currentUser.userId;
        const abExists = await prisma.user.findUnique({ where: { id: targetAssignedById } });

        const payload = {
          licenseId: targetLicId,
          userId: uExists ? targetUserId : null,
          assetId: aExists ? targetAssetId : null,
          assignedDate: la.assignedDate ? new Date(la.assignedDate) : new Date(),
          assignedById: abExists ? targetAssignedById : currentUser.userId,
          notes: la.notes,
        };

        const existing = await prisma.licenseAssignment.findUnique({ where: { id: la.id } });
        if (existing) {
          await prisma.licenseAssignment.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.licenseAssignment.create({ data: { id: la.id, ...payload } });
        }
        restoredCounts.licenseAssignments++;
      }
    }

    // 21. Passwords (KeePass)
    if (Array.isArray(backupData.passwordEntries)) {
      for (const p of backupData.passwordEntries) {
        const targetAssetId = p.assetId ? (assetIdMap.get(p.assetId) || p.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const targetVendorId = p.vendorId ? (vendorIdMap.get(p.vendorId) || p.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const targetSrvId = p.serviceId ? (serviceIdMap.get(p.serviceId) || p.serviceId) : null;
        const sExists = targetSrvId ? await prisma.iTService.findUnique({ where: { id: targetSrvId } }) : null;

        const targetUserId = p.createdById ? (userIdMap.get(p.createdById) || p.createdById) : currentUser.userId;
        const uExists = await prisma.user.findUnique({ where: { id: targetUserId } });

        const payload = {
          title: p.title,
          username: p.username,
          password: p.password || p.encryptedPassword || '',
          url: p.url,
          category: p.category || 'GENERAL',
          groupName: p.groupName,
          companyName: p.companyName,
          isFavorite: Boolean(p.isFavorite),
          totpSecret: p.totpSecret,
          notes: p.notes,
          assetId: aExists ? targetAssetId : null,
          vendorId: vExists ? targetVendorId : null,
          serviceId: sExists ? targetSrvId : null,
          createdById: uExists ? targetUserId : currentUser.userId,
        };

        const existing = await prisma.passwordEntry.findUnique({ where: { id: p.id } });
        if (existing) {
          await prisma.passwordEntry.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.passwordEntry.create({ data: { id: p.id, ...payload } });
        }
        restoredCounts.passwords++;
      }
    }

    // 22. Problems
    if (Array.isArray(backupData.problems)) {
      for (const prb of backupData.problems) {
        const targetCreatedById = prb.createdById ? (userIdMap.get(prb.createdById) || prb.createdById) : currentUser.userId;
        const uExists = await prisma.user.findUnique({ where: { id: targetCreatedById } });

        const targetAssignedToId = prb.assignedToId ? (userIdMap.get(prb.assignedToId) || prb.assignedToId) : null;
        const aExists = targetAssignedToId ? await prisma.user.findUnique({ where: { id: targetAssignedToId } }) : null;

        const existing = await prisma.problem.findFirst({
          where: { OR: [{ id: prb.id }, { problemNumber: prb.problemNumber }] },
        });

        const payload = {
          problemNumber: prb.problemNumber,
          title: prb.title,
          description: prb.description,
          priority: prb.priority,
          status: prb.status,
          rootCause: prb.rootCause,
          workaround: prb.workaround,
          resolution: prb.resolution,
          createdById: uExists ? targetCreatedById : currentUser.userId,
          assignedToId: aExists ? targetAssignedToId : null,
        };

        if (existing) {
          problemIdMap.set(prb.id, existing.id);
          await prisma.problem.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.problem.create({ data: { id: prb.id, ...payload } });
          problemIdMap.set(prb.id, created.id);
        }
        restoredCounts.problems++;
      }
    }

    // 23. Incidents
    if (Array.isArray(backupData.incidents)) {
      for (const inc of backupData.incidents) {
        const targetCreatedById = inc.createdById ? (userIdMap.get(inc.createdById) || inc.createdById) : currentUser.userId;
        const uExists = await prisma.user.findUnique({ where: { id: targetCreatedById } });

        const targetAssignedToId = inc.assignedToId ? (userIdMap.get(inc.assignedToId) || inc.assignedToId) : null;
        const aExists = targetAssignedToId ? await prisma.user.findUnique({ where: { id: targetAssignedToId } }) : null;

        const targetTeamId = inc.teamId ? (teamIdMap.get(inc.teamId) || inc.teamId) : null;
        const tExists = targetTeamId ? await prisma.supportTeam.findUnique({ where: { id: targetTeamId } }) : null;

        const targetProblemId = inc.problemId ? (problemIdMap.get(inc.problemId) || inc.problemId) : null;
        const pExists = targetProblemId ? await prisma.problem.findUnique({ where: { id: targetProblemId } }) : null;

        const existing = await prisma.incident.findFirst({
          where: { OR: [{ id: inc.id }, { incidentNumber: inc.incidentNumber }] },
        });

        const payload = {
          incidentNumber: inc.incidentNumber,
          title: inc.title,
          description: inc.description,
          severity: inc.severity,
          status: inc.status,
          impact: inc.impact,
          affectedServices: Array.isArray(inc.affectedServices) ? inc.affectedServices : [],
          affectedLocations: Array.isArray(inc.affectedLocations) ? inc.affectedLocations : [],
          workaround: inc.workaround,
          resolutionNotes: inc.resolutionNotes,
          teamId: tExists ? targetTeamId : null,
          createdById: uExists ? targetCreatedById : currentUser.userId,
          assignedToId: aExists ? targetAssignedToId : null,
          problemId: pExists ? targetProblemId : null,
          startedAt: inc.startedAt ? new Date(inc.startedAt) : new Date(),
          identifiedAt: inc.identifiedAt ? new Date(inc.identifiedAt) : null,
          resolvedAt: inc.resolvedAt ? new Date(inc.resolvedAt) : null,
          closedAt: inc.closedAt ? new Date(inc.closedAt) : null,
        };

        if (existing) {
          incidentIdMap.set(inc.id, existing.id);
          await prisma.incident.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.incident.create({ data: { id: inc.id, ...payload } });
          incidentIdMap.set(inc.id, created.id);
        }
        restoredCounts.incidents++;
      }
    }

    // 24. Incident Updates
    if (Array.isArray(backupData.incidentUpdates)) {
      for (const upd of backupData.incidentUpdates) {
        const targetIncId = incidentIdMap.get(upd.incidentId) || upd.incidentId;
        const incExists = await prisma.incident.findUnique({ where: { id: targetIncId } });
        if (!incExists) continue;

        const targetUserId = upd.userId ? (userIdMap.get(upd.userId) || upd.userId) : (upd.createdById ? (userIdMap.get(upd.createdById) || upd.createdById) : currentUser.userId);
        const uExists = await prisma.user.findUnique({ where: { id: targetUserId } });

        const payload = {
          incidentId: targetIncId,
          userId: uExists ? targetUserId : currentUser.userId,
          content: upd.content || upd.message || '',
          statusChange: upd.statusChange,
          isPublic: upd.isPublic !== undefined ? Boolean(upd.isPublic) : true,
        };

        const existing = await prisma.incidentUpdate.findUnique({ where: { id: upd.id } });
        if (existing) {
          await prisma.incidentUpdate.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.incidentUpdate.create({ data: { id: upd.id, ...payload } });
        }
        restoredCounts.incidentUpdates++;
      }
    }

    // 25. Tickets
    if (Array.isArray(backupData.tickets)) {
      for (const t of backupData.tickets) {
        const { comments, ...ticketPayload } = t;

        const targetAssetId = ticketPayload.assetId ? (assetIdMap.get(ticketPayload.assetId) || ticketPayload.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const targetCreatedById = ticketPayload.createdById ? (userIdMap.get(ticketPayload.createdById) || ticketPayload.createdById) : null;
        let cExists = targetCreatedById ? await prisma.user.findUnique({ where: { id: targetCreatedById } }) : null;
        if (!cExists) {
          cExists = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        }
        if (!cExists) {
          cExists = await prisma.user.findFirst();
        }
        if (!cExists) continue;

        const targetAssignedToId = ticketPayload.assignedToId ? (userIdMap.get(ticketPayload.assignedToId) || ticketPayload.assignedToId) : null;
        const assignExists = targetAssignedToId ? await prisma.user.findUnique({ where: { id: targetAssignedToId } }) : null;

        const targetTeamId = ticketPayload.teamId ? (teamIdMap.get(ticketPayload.teamId) || ticketPayload.teamId) : null;
        const teamExists = targetTeamId ? await prisma.supportTeam.findUnique({ where: { id: targetTeamId } }) : null;

        const targetQueueId = ticketPayload.queueId ? (queueIdMap.get(ticketPayload.queueId) || ticketPayload.queueId) : null;
        const queueExists = targetQueueId ? await prisma.supportQueue.findUnique({ where: { id: targetQueueId } }) : null;

        const targetIncId = ticketPayload.incidentId ? (incidentIdMap.get(ticketPayload.incidentId) || ticketPayload.incidentId) : null;
        const incExists = targetIncId ? await prisma.incident.findUnique({ where: { id: targetIncId } }) : null;

        const targetOverriddenById = ticketPayload.overriddenById ? (userIdMap.get(ticketPayload.overriddenById) || ticketPayload.overriddenById) : null;
        const oExists = targetOverriddenById ? await prisma.user.findUnique({ where: { id: targetOverriddenById } }) : null;

        const payload = {
          ticketNumber: ticketPayload.ticketNumber,
          title: ticketPayload.title,
          description: ticketPayload.description,
          category: ticketPayload.category,
          priority: ticketPayload.priority,
          status: ticketPayload.status,
          createdById: cExists.id,
          assignedToId: assignExists ? assignExists.id : null,
          assetId: aExists ? targetAssetId : null,
          customAssetName: ticketPayload.customAssetName,
          companyName: ticketPayload.companyName,
          subCategory: ticketPayload.subCategory,
          dueDate: ticketPayload.dueDate ? new Date(ticketPayload.dueDate) : null,
          resolvedAt: ticketPayload.resolvedAt ? new Date(ticketPayload.resolvedAt) : null,
          resolutionNotes: ticketPayload.resolutionNotes,
          attachmentUrls: ticketPayload.attachmentUrls,
          teamId: teamExists ? targetTeamId : null,
          queueId: queueExists ? targetQueueId : null,
          incidentId: incExists ? targetIncId : null,
          routedAt: ticketPayload.routedAt ? new Date(ticketPayload.routedAt) : null,
          routedByRule: ticketPayload.routedByRule,
          isAutoRouted: Boolean(ticketPayload.isAutoRouted),
          routingLog: ticketPayload.routingLog,
          reassignmentCount: ticketPayload.reassignmentCount || 0,
          overrideReason: ticketPayload.overrideReason,
          overriddenById: oExists ? targetOverriddenById : null,
          slaDeadline: ticketPayload.slaDeadline ? new Date(ticketPayload.slaDeadline) : null,
          originalSlaDeadline: ticketPayload.originalSlaDeadline ? new Date(ticketPayload.originalSlaDeadline) : null,
          firstResponseAt: ticketPayload.firstResponseAt ? new Date(ticketPayload.firstResponseAt) : null,
          slaPausedAt: ticketPayload.slaPausedAt ? new Date(ticketPayload.slaPausedAt) : null,
          totalSlaPausedMinutes: ticketPayload.totalSlaPausedMinutes || 0,
          isSlaExtended: Boolean(ticketPayload.isSlaExtended),
          slaExtensionReason: ticketPayload.slaExtensionReason,
          slaExtensionHistory: ticketPayload.slaExtensionHistory,
          rating: ticketPayload.rating,
          ratingComment: ticketPayload.ratingComment,
          ratedAt: ticketPayload.ratedAt ? new Date(ticketPayload.ratedAt) : null,
          aiAnalysis: ticketPayload.aiAnalysis,
          actualSpentMinutes: ticketPayload.actualSpentMinutes || 0,
        };

        const existingTicket = await prisma.ticket.findFirst({
          where: { OR: [{ id: t.id }, { ticketNumber: t.ticketNumber }] },
        });

        if (existingTicket) {
          ticketIdMap.set(t.id, existingTicket.id);
          await prisma.ticket.update({ where: { id: existingTicket.id }, data: payload });
        } else {
          const created = await prisma.ticket.create({ data: { id: t.id, ...payload } });
          ticketIdMap.set(t.id, created.id);
        }
        restoredCounts.tickets++;
      }
    }

    // 26. Ticket Comments
    if (Array.isArray(backupData.ticketComments)) {
      for (const tc of backupData.ticketComments) {
        const targetTicketId = ticketIdMap.get(tc.ticketId) || tc.ticketId;
        const ticketExists = await prisma.ticket.findUnique({ where: { id: targetTicketId } });
        if (!ticketExists) continue;

        const targetUserId = tc.userId ? (userIdMap.get(tc.userId) || tc.userId) : (tc.authorId ? (userIdMap.get(tc.authorId) || tc.authorId) : currentUser.userId);
        let authorExists = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!authorExists) {
          authorExists = await prisma.user.findUnique({ where: { id: currentUser.userId } });
        }
        if (!authorExists) continue;

        const payload = {
          ticketId: targetTicketId,
          userId: authorExists.id,
          content: tc.content,
          isInternal: Boolean(tc.isInternal),
          attachmentUrls: tc.attachmentUrls,
          spentMinutes: tc.spentMinutes,
          createdAt: tc.createdAt ? new Date(tc.createdAt) : new Date(),
        };

        const existing = await prisma.ticketComment.findUnique({ where: { id: tc.id } });
        if (existing) {
          await prisma.ticketComment.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.ticketComment.create({ data: { id: tc.id, ...payload } });
        }
        restoredCounts.ticketComments++;
      }
    }

    // 27. Canned Responses
    if (Array.isArray(backupData.cannedResponses)) {
      for (const cr of backupData.cannedResponses) {
        const targetCreatedById = cr.createdById ? (userIdMap.get(cr.createdById) || cr.createdById) : currentUser.userId;
        const uExists = await prisma.user.findUnique({ where: { id: targetCreatedById } });

        const payload = {
          title: cr.title,
          shortcut: cr.shortcut,
          content: cr.content,
          category: cr.category,
          isShared: cr.isShared !== undefined ? Boolean(cr.isShared) : true,
          createdById: uExists ? targetCreatedById : currentUser.userId,
        };

        const existing = await prisma.cannedResponse.findUnique({ where: { id: cr.id } });
        if (existing) {
          await prisma.cannedResponse.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.cannedResponse.create({ data: { id: cr.id, ...payload } });
        }
        restoredCounts.cannedResponses++;
      }
    }

    // 28. Documents
    if (Array.isArray(backupData.documents)) {
      for (const d of backupData.documents) {
        const targetAssetId = d.assetId ? (assetIdMap.get(d.assetId) || d.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const targetVendorId = d.vendorId ? (vendorIdMap.get(d.vendorId) || d.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const targetLicId = d.licenseId ? (licenseIdMap.get(d.licenseId) || d.licenseId) : null;
        const licExists = targetLicId ? await prisma.license.findUnique({ where: { id: targetLicId } }) : null;

        const targetSrvId = d.serviceId ? (serviceIdMap.get(d.serviceId) || d.serviceId) : null;
        const sExists = targetSrvId ? await prisma.iTService.findUnique({ where: { id: targetSrvId } }) : null;

        const targetUserId = d.createdById ? (userIdMap.get(d.createdById) || d.createdById) : null;
        const uExists = targetUserId ? await prisma.user.findUnique({ where: { id: targetUserId } }) : null;

        const payload = {
          title: d.title,
          fileName: d.fileName,
          fileUrl: d.fileUrl,
          fileType: d.fileType,
          fileSize: d.fileSize,
          category: d.category || 'OTHER',
          notes: d.notes,
          assetId: aExists ? targetAssetId : null,
          vendorId: vExists ? targetVendorId : null,
          licenseId: licExists ? targetLicId : null,
          serviceId: sExists ? targetSrvId : null,
          createdById: uExists ? targetUserId : null,
        };

        const existing = await prisma.document.findUnique({ where: { id: d.id } });
        if (existing) {
          await prisma.document.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.document.create({ data: { id: d.id, ...payload } });
        }
        restoredCounts.documents++;
      }
    }

    // 29. Approval Requests
    if (Array.isArray(backupData.approvalRequests)) {
      for (const ar of backupData.approvalRequests) {
        const targetReqId = ar.requesterId ? (userIdMap.get(ar.requesterId) || ar.requesterId) : currentUser.userId;
        const rExists = await prisma.user.findUnique({ where: { id: targetReqId } });

        const targetMgrId = ar.managerId ? (userIdMap.get(ar.managerId) || ar.managerId) : null;
        const mExists = targetMgrId ? await prisma.user.findUnique({ where: { id: targetMgrId } }) : null;

        const targetItId = ar.itApproverId ? (userIdMap.get(ar.itApproverId) || ar.itApproverId) : null;
        const itExists = targetItId ? await prisma.user.findUnique({ where: { id: targetItId } }) : null;

        const existing = await prisma.approvalRequest.findFirst({
          where: { OR: [{ id: ar.id }, { code: ar.code }] },
        });

        const payload = {
          code: ar.code,
          type: ar.type,
          status: ar.status,
          title: ar.title,
          description: ar.description,
          requesterId: rExists ? targetReqId : currentUser.userId,
          department: ar.department,
          companyName: ar.companyName,
          urgency: ar.urgency,
          costEstimate: ar.costEstimate,
          currency: ar.currency || 'VND',
          managerId: mExists ? targetMgrId : null,
          managerDecision: ar.managerDecision,
          managerNote: ar.managerNote,
          managerDecisionAt: ar.managerDecisionAt ? new Date(ar.managerDecisionAt) : null,
          itApproverId: itExists ? targetItId : null,
          itDecision: ar.itDecision,
          itNote: ar.itNote,
          itDecisionAt: ar.itDecisionAt ? new Date(ar.itDecisionAt) : null,
          details: ar.details,
          rejectionReason: ar.rejectionReason,
        };

        if (existing) {
          await prisma.approvalRequest.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.approvalRequest.create({ data: { id: ar.id, ...payload } });
        }
        restoredCounts.approvals++;
      }
    }

    // 30. Maintenance Schedules
    if (Array.isArray(backupData.maintenanceSchedules)) {
      for (const ms of backupData.maintenanceSchedules) {
        const targetAssetId = ms.assetId ? (assetIdMap.get(ms.assetId) || ms.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const targetCatId = ms.categoryId ? (categoryIdMap.get(ms.categoryId) || ms.categoryId) : null;
        const catExists = targetCatId ? await prisma.assetCategory.findUnique({ where: { id: targetCatId } }) : null;

        const targetAssignToId = ms.assignToId ? (userIdMap.get(ms.assignToId) || ms.assignToId) : (ms.assignedToId ? (userIdMap.get(ms.assignedToId) || ms.assignedToId) : null);
        const uExists = targetAssignToId ? await prisma.user.findUnique({ where: { id: targetAssignToId } }) : null;

        const payload = {
          name: ms.name,
          description: ms.description,
          frequency: ms.frequency || 'MONTHLY',
          maintenanceType: ms.maintenanceType || 'PREVENTIVE',
          assetId: aExists ? targetAssetId : null,
          categoryId: catExists ? targetCatId : null,
          lastRunAt: ms.lastRunAt ? new Date(ms.lastRunAt) : (ms.lastRunDate ? new Date(ms.lastRunDate) : null),
          nextRunAt: ms.nextRunAt ? new Date(ms.nextRunAt) : (ms.nextRunDate ? new Date(ms.nextRunDate) : new Date()),
          isActive: ms.isActive !== undefined ? Boolean(ms.isActive) : true,
          autoCreateTicket: ms.autoCreateTicket !== undefined ? Boolean(ms.autoCreateTicket) : true,
          ticketPriority: ms.ticketPriority || 'MEDIUM',
          assignToId: uExists ? targetAssignToId : null,
        };

        const existing = await prisma.maintenanceSchedule.findUnique({ where: { id: ms.id } });
        if (existing) {
          await prisma.maintenanceSchedule.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.maintenanceSchedule.create({ data: { id: ms.id, ...payload } });
        }
        restoredCounts.maintenanceSchedules++;
      }
    }

    // 31. Spare Parts
    if (Array.isArray(backupData.spareParts)) {
      for (const sp of backupData.spareParts) {
        const targetCatId = sp.categoryId ? (categoryIdMap.get(sp.categoryId) || sp.categoryId) : null;
        const catExists = targetCatId ? await prisma.assetCategory.findUnique({ where: { id: targetCatId } }) : null;

        const targetVendorId = sp.vendorId ? (vendorIdMap.get(sp.vendorId) || sp.vendorId) : null;
        const vExists = targetVendorId ? await prisma.vendor.findUnique({ where: { id: targetVendorId } }) : null;

        const targetLocId = sp.locationId ? (locationIdMap.get(sp.locationId) || sp.locationId) : null;
        const locExists = targetLocId ? await prisma.location.findUnique({ where: { id: targetLocId } }) : null;

        const existing = await prisma.sparePart.findFirst({
          where: { OR: [{ id: sp.id }, ...(sp.sku ? [{ sku: sp.sku }] : [])] },
        });

        const payload = {
          name: sp.name,
          sku: sp.sku,
          categoryId: catExists ? targetCatId : null,
          quantity: sp.quantity || 0,
          minStock: sp.minStock || 5,
          unit: sp.unit || 'cái',
          unitPrice: sp.unitPrice,
          currency: sp.currency || 'VND',
          vendorId: vExists ? targetVendorId : null,
          locationId: locExists ? targetLocId : null,
          notes: sp.notes,
        };

        if (existing) {
          sparePartIdMap.set(sp.id, existing.id);
          await prisma.sparePart.update({ where: { id: existing.id }, data: payload });
        } else {
          const created = await prisma.sparePart.create({ data: { id: sp.id, ...payload } });
          sparePartIdMap.set(sp.id, created.id);
        }
        restoredCounts.spareParts++;
      }
    }

    // 32. Spare Part Transactions
    if (Array.isArray(backupData.sparePartTransactions)) {
      for (const spt of backupData.sparePartTransactions) {
        const targetSpId = sparePartIdMap.get(spt.sparePartId) || spt.sparePartId;
        const spExists = await prisma.sparePart.findUnique({ where: { id: targetSpId } });
        if (!spExists) continue;

        const targetPerfId = spt.performedById ? (userIdMap.get(spt.performedById) || spt.performedById) : currentUser.userId;
        const pExists = await prisma.user.findUnique({ where: { id: targetPerfId } });

        const targetAssetId = spt.assetId ? (assetIdMap.get(spt.assetId) || spt.assetId) : null;
        const aExists = targetAssetId ? await prisma.asset.findUnique({ where: { id: targetAssetId } }) : null;

        const payload = {
          sparePartId: targetSpId,
          type: spt.type,
          quantity: spt.quantity,
          note: spt.note,
          maintenanceLogId: spt.maintenanceLogId,
          assetId: aExists ? targetAssetId : null,
          performedById: pExists ? targetPerfId : currentUser.userId,
          createdAt: spt.createdAt ? new Date(spt.createdAt) : new Date(),
        };

        const existing = await prisma.sparePartTransaction.findUnique({ where: { id: spt.id } });
        if (existing) {
          await prisma.sparePartTransaction.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.sparePartTransaction.create({ data: { id: spt.id, ...payload } });
        }
        restoredCounts.sparePartTransactions++;
      }
    }

    // 33. Floor Maps
    if (Array.isArray(backupData.floorMaps)) {
      for (const fm of backupData.floorMaps) {
        const targetLocId = locationIdMap.get(fm.locationId) || fm.locationId;
        const locExists = await prisma.location.findUnique({ where: { id: targetLocId } });
        if (!locExists) continue;

        const payload = {
          locationId: targetLocId,
          name: fm.name,
          imageUrl: fm.imageUrl,
          markers: fm.markers || [],
        };

        const existing = await prisma.floorMap.findUnique({ where: { id: fm.id } });
        if (existing) {
          await prisma.floorMap.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.floorMap.create({ data: { id: fm.id, ...payload } });
        }
        restoredCounts.floorMaps++;
      }
    }

    // 34. Webhook Configs
    if (Array.isArray(backupData.webhookConfigs)) {
      for (const wh of backupData.webhookConfigs) {
        const payload = {
          name: wh.name,
          provider: wh.provider,
          webhookUrl: wh.webhookUrl,
          events: wh.events || [],
          isActive: wh.isActive !== undefined ? Boolean(wh.isActive) : true,
        };

        const existing = await prisma.webhookConfig.findUnique({ where: { id: wh.id } });
        if (existing) {
          await prisma.webhookConfig.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.webhookConfig.create({ data: { id: wh.id, ...payload } });
        }
        restoredCounts.webhooks++;
      }
    }

    // 35. Email Templates
    if (Array.isArray(backupData.emailTemplates)) {
      for (const et of backupData.emailTemplates) {
        const payload = {
          code: et.code,
          name: et.name,
          subject: et.subject,
          bodyHtml: et.bodyHtml || et.htmlBody || '',
          isActive: et.isActive !== undefined ? Boolean(et.isActive) : true,
        };

        const existing = await prisma.emailTemplate.findFirst({
          where: { OR: [{ id: et.id }, { code: et.code }] },
        });
        if (existing) {
          await prisma.emailTemplate.update({ where: { id: existing.id }, data: payload });
        } else {
          await prisma.emailTemplate.create({ data: { id: et.id, ...payload } });
        }
        restoredCounts.emailTemplates++;
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
      message: `Phục hồi hoàn tất ${totalRestored} bản ghi (Nhân sự: ${restoredCounts.users}, Tài sản: ${restoredCounts.assets}, Bản quyền: ${restoredCounts.licenses}, Tickets: ${restoredCounts.tickets}, Đội HT: ${restoredCounts.supportTeams}, Sự cố: ${restoredCounts.incidents}, v.v.)!`,
      restoredCounts,
    });
  } catch (error: any) {
    console.error('Restore system error:', error);
    return NextResponse.json({ error: 'Lỗi phục hồi dữ liệu từ file backup: ' + (error?.message || error) }, { status: 500 });
  }
}
