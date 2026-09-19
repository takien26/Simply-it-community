import { prisma } from './db';
import { createAuditLog } from './audit';

export const DEFAULT_RETENTION_DAYS = 30;

/**
 * Lấy số ngày lưu trữ trong Thùng rác từ SystemSetting (Mặc định: 30 ngày)
 */
export async function getTrashRetentionDays(): Promise<number> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'trash_retention_days' },
    });
    if (setting && setting.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch (error) {
    console.error('Failed to get trash retention setting:', error);
  }
  return DEFAULT_RETENTION_DAYS;
}

/**
 * Cập nhật số ngày lưu trữ trong Thùng rác
 */
export async function setTrashRetentionDays(days: number): Promise<number> {
  const finalDays = Math.max(1, Math.min(365, days));
  await prisma.systemSetting.upsert({
    where: { key: 'trash_retention_days' },
    update: { value: String(finalDays) },
    create: {
      key: 'trash_retention_days',
      value: String(finalDays),
      label: 'Thời gian lưu trữ trong Thùng rác (ngày)',
      group: 'system',
      type: 'NUMBER',
    },
  });
  return finalDays;
}

export interface MoveToTrashParams {
  entityType: 'ASSET' | 'USER' | 'LICENSE' | 'TICKET' | 'DOCUMENT' | 'SPARE_PART' | 'VENDOR' | 'CATEGORY' | 'PASSWORD' | 'INCIDENT' | 'PROBLEM';
  entityId: string;
  entityName: string;
  entityCode?: string | null;
  dataSnapshot: any;
  deletedById?: string | null;
  deletedByName?: string | null;
}

/**
 * Đưa đối tượng vào Thùng rác (Recycle Bin) kèm snapshot dữ liệu để khôi phục
 */
export async function moveToTrash(params: MoveToTrashParams) {
  const retentionDays = await getTrashRetentionDays();
  const expiresAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

  const trashItem = await prisma.trashItem.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      entityName: params.entityName,
      entityCode: params.entityCode || null,
      dataSnapshot: params.dataSnapshot || {},
      deletedById: params.deletedById || null,
      deletedByName: params.deletedByName || null,
      expiresAt,
    },
  });

  return { trashItem, retentionDays, expiresAt };
}

/**
 * Tự động xóa vĩnh viễn các mục trong thùng rác đã quá hạn
 */
export async function autoPurgeExpiredTrash() {
  try {
    const result = await prisma.trashItem.deleteMany({
      where: {
        expiresAt: {
          lte: new Date(),
        },
      },
    });
    return result.count;
  } catch (error) {
    console.error('Error auto purging trash:', error);
    return 0;
  }
}

/**
 * Khôi phục bản ghi từ Thùng rác về bảng gốc tương ứng
 */
export async function restoreFromTrash(trashId: string, currentUserId?: string) {
  const trashItem = await prisma.trashItem.findUnique({
    where: { id: trashId },
  });

  if (!trashItem) {
    throw new Error('Mục trong thùng rác không tồn tại hoặc đã bị xóa vĩnh viễn.');
  }

  const snapshot = trashItem.dataSnapshot as any;
  let restoredEntity: any = null;

  switch (trashItem.entityType) {
    case 'ASSET': {
      // Preserve original ID if available and not taken
      let targetId: string | undefined = undefined;
      if (snapshot.id) {
        const idExists = await prisma.asset.findUnique({ where: { id: snapshot.id } });
        if (!idExists) targetId = snapshot.id;
      }

      // Kiểm tra trùng lặp assetTag
      let assetTag = snapshot.assetTag;
      if (assetTag) {
        const existingTag = await prisma.asset.findUnique({ where: { assetTag } });
        if (existingTag) {
          assetTag = `${assetTag}-RESTORED-${Date.now().toString().slice(-4)}`;
        }
      }

      // Kiểm tra trùng lặp serialNumber nếu có
      let serialNumber = snapshot.serialNumber || null;
      if (serialNumber) {
        const existingSerial = await prisma.asset.findUnique({ where: { serialNumber } });
        if (existingSerial) {
          serialNumber = `${serialNumber}-RESTORED-${Date.now().toString().slice(-4)}`;
        }
      }

      // Xác minh vendorId, locationId, categoryId còn tồn tại không
      let vendorId = snapshot.vendorId;
      if (vendorId) {
        const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!v) vendorId = null;
      }

      let locationId = snapshot.locationId;
      if (locationId) {
        const l = await prisma.location.findUnique({ where: { id: locationId } });
        if (!l) locationId = null;
      }

      let categoryId = snapshot.categoryId;
      if (categoryId) {
        const c = await prisma.assetCategory.findUnique({ where: { id: categoryId } });
        if (!c) categoryId = null;
      }
      if (!categoryId) {
        const defaultCategory = await prisma.assetCategory.findFirst({ orderBy: { createdAt: 'asc' } });
        categoryId = defaultCategory?.id;
      }

      const purchasePrice = snapshot.purchasePrice !== undefined && snapshot.purchasePrice !== null
        ? snapshot.purchasePrice
        : snapshot.purchaseCost !== undefined && snapshot.purchaseCost !== null
        ? snapshot.purchaseCost
        : null;
      const purchaseCurrency = snapshot.purchaseCurrency || snapshot.currency || 'VND';

      restoredEntity = await prisma.asset.create({
        data: {
          ...(targetId ? { id: targetId } : {}),
          assetTag: assetTag || `TAG-${Date.now()}`,
          name: snapshot.name || trashItem.entityName,
          brand: snapshot.brand || null,
          model: snapshot.model || null,
          serialNumber,
          status: 'AVAILABLE',
          condition: snapshot.condition || 'GOOD',
          purchaseDate: snapshot.purchaseDate ? new Date(snapshot.purchaseDate) : null,
          purchasePrice,
          purchaseCurrency,
          warrantyExpiry: snapshot.warrantyExpiry ? new Date(snapshot.warrantyExpiry) : null,
          vendorId,
          locationId,
          categoryId,
          specs: snapshot.specs || {},
          notes: snapshot.notes ? `${snapshot.notes} (Đã khôi phục từ Thùng rác)` : '(Đã khôi phục từ Thùng rác)',
          companyName: snapshot.companyName || null,
        },
      });
      break;
    }

    case 'USER': {
      // Nếu user vẫn còn trong DB nhưng bị isActive = false
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { id: trashItem.entityId },
            { email: snapshot.email },
          ],
        },
      });

      if (existingUser) {
        restoredEntity = await prisma.user.update({
          where: { id: existingUser.id },
          data: { isActive: true },
        });
      } else {
        // Recreate user if hard deleted
        let roleId = snapshot.roleId || snapshot.role?.id;
        if (!roleId) {
          const defaultRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
          roleId = defaultRole?.id;
        }

        let targetId: string | undefined = undefined;
        if (snapshot.id) {
          const idExists = await prisma.user.findUnique({ where: { id: snapshot.id } });
          if (!idExists) targetId = snapshot.id;
        }

        restoredEntity = await prisma.user.create({
          data: {
            ...(targetId ? { id: targetId } : {}),
            fullName: snapshot.fullName || trashItem.entityName,
            email: snapshot.email,
            passwordHash: snapshot.passwordHash || snapshot.password || '$2a$10$defaultHashPlaceholder',
            position: snapshot.position || null,
            department: snapshot.department || null,
            companyName: snapshot.companyName || null,
            phone: snapshot.phone || null,
            roleId,
            isActive: true,
          },
        });
      }
      break;
    }

    case 'LICENSE': {
      let targetId: string | undefined = undefined;
      if (snapshot.id) {
        const idExists = await prisma.license.findUnique({ where: { id: snapshot.id } });
        if (!idExists) targetId = snapshot.id;
      }

      let vendorId = snapshot.vendorId;
      if (vendorId) {
        const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!v) vendorId = null;
      }

      restoredEntity = await prisma.license.create({
        data: {
          ...(targetId ? { id: targetId } : {}),
          name: snapshot.name || trashItem.entityName,
          licenseKey: snapshot.licenseKey || null,
          licenseType: snapshot.licenseType || 'SUBSCRIPTION',
          totalSeats: snapshot.totalSeats || 1,
          usedSeats: 0,
          purchaseDate: snapshot.purchaseDate ? new Date(snapshot.purchaseDate) : null,
          expiryDate: snapshot.expiryDate ? new Date(snapshot.expiryDate) : null,
          purchasePrice: snapshot.purchasePrice || null,
          purchaseCurrency: snapshot.purchaseCurrency || 'VND',
          vendorId,
          companyName: snapshot.companyName || null,
          contractNumber: snapshot.contractNumber || null,
          invoiceNumber: snapshot.invoiceNumber || null,
          specs: snapshot.specs || {},
          notes: snapshot.notes ? `${snapshot.notes} (Đã khôi phục từ Thùng rác)` : '(Đã khôi phục từ Thùng rác)',
          status: 'ACTIVE',
        },
      });
      break;
    }

    case 'TICKET': {
      let ticketNumber = snapshot.ticketNumber;
      if (ticketNumber) {
        const exists = await prisma.ticket.findUnique({ where: { ticketNumber } });
        if (exists) {
          ticketNumber = `${ticketNumber}-R${Date.now().toString().slice(-4)}`;
        }
      }

      let createdById = snapshot.createdById || currentUserId || trashItem.deletedById;
      if (createdById) {
        const userExists = await prisma.user.findUnique({ where: { id: createdById } });
        if (!userExists) {
          const firstAdmin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
          createdById = firstAdmin?.id || null;
        }
      }

      restoredEntity = await prisma.ticket.create({
        data: {
          ticketNumber: ticketNumber || `TK-${Date.now()}`,
          title: snapshot.title || trashItem.entityName,
          description: snapshot.description || '(Khôi phục từ Thùng rác)',
          category: snapshot.category || 'HARDWARE',
          priority: snapshot.priority || 'MEDIUM',
          status: 'OPEN',
          createdById: createdById || undefined,
          companyName: snapshot.companyName || null,
        },
      });
      break;
    }

    case 'DOCUMENT': {
      let assetId = snapshot.assetId;
      if (assetId) {
        const a = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!a) assetId = null;
      }
      let licenseId = snapshot.licenseId;
      if (licenseId) {
        const l = await prisma.license.findUnique({ where: { id: licenseId } });
        if (!l) licenseId = null;
      }
      let vendorId = snapshot.vendorId;
      if (vendorId) {
        const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!v) vendorId = null;
      }

      restoredEntity = await prisma.document.create({
        data: {
          title: snapshot.title || trashItem.entityName,
          type: snapshot.type || 'INVOICE',
          contractNumber: snapshot.contractNumber || null,
          invoiceNumber: snapshot.invoiceNumber || null,
          companyName: snapshot.companyName || null,
          fileUrl: snapshot.fileUrl || '',
          fileName: snapshot.fileName || 'file',
          fileSize: snapshot.fileSize || 0,
          fileType: snapshot.fileType || 'application/pdf',
          notes: snapshot.notes ? `${snapshot.notes} (Đã khôi phục)` : '(Đã khôi phục)',
          assetId,
          licenseId,
          vendorId,
        },
      });
      break;
    }

    case 'SPARE_PART': {
      let sku = snapshot.sku;
      if (sku) {
        const exists = await prisma.sparePart.findUnique({ where: { sku } });
        if (exists) {
          sku = `${sku}-R${Date.now().toString().slice(-4)}`;
        }
      }

      restoredEntity = await prisma.sparePart.create({
        data: {
          name: snapshot.name || trashItem.entityName,
          sku,
          quantity: snapshot.quantity || 0,
          minStock: snapshot.minStock || 5,
          unit: snapshot.unit || 'cái',
          unitPrice: snapshot.unitPrice || null,
          currency: snapshot.currency || 'VND',
        },
      });
      break;
    }

    case 'PASSWORD': {
      let targetId: string | undefined = undefined;
      if (snapshot.id) {
        const idExists = await prisma.passwordEntry.findUnique({ where: { id: snapshot.id } });
        if (!idExists) targetId = snapshot.id;
      }
      let assetId = snapshot.assetId;
      if (assetId) {
        const a = await prisma.asset.findUnique({ where: { id: assetId } });
        if (!a) assetId = null;
      }
      let serviceId = snapshot.serviceId;
      if (serviceId) {
        const s = await prisma.iTService.findUnique({ where: { id: serviceId } });
        if (!s) serviceId = null;
      }
      let vendorId = snapshot.vendorId;
      if (vendorId) {
        const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!v) vendorId = null;
      }
      let createdById = snapshot.createdById || currentUserId || trashItem.deletedById;
      if (createdById) {
        const u = await prisma.user.findUnique({ where: { id: createdById } });
        if (!u) createdById = null;
      }

      restoredEntity = await prisma.passwordEntry.create({
        data: {
          ...(targetId ? { id: targetId } : {}),
          title: snapshot.title || trashItem.entityName,
          username: snapshot.username || null,
          password: snapshot.password || '',
          url: snapshot.url || null,
          category: snapshot.category || 'GENERAL',
          groupName: snapshot.groupName || null,
          companyName: snapshot.companyName || null,
          assetId,
          serviceId,
          vendorId,
          isFavorite: Boolean(snapshot.isFavorite),
          totpSecret: snapshot.totpSecret || null,
          notes: snapshot.notes ? `${snapshot.notes} (Đã khôi phục)` : '(Đã khôi phục từ Thùng rác)',
          createdById,
        },
      });
      break;
    }

    case 'INCIDENT': {
      let incidentNumber = snapshot.incidentNumber;
      if (incidentNumber) {
        const exists = await prisma.incident.findUnique({ where: { incidentNumber } });
        if (exists) {
          incidentNumber = `${incidentNumber}-R${Date.now().toString().slice(-4)}`;
        }
      }
      let createdById = snapshot.createdById || currentUserId || trashItem.deletedById;
      if (createdById) {
        const u = await prisma.user.findUnique({ where: { id: createdById } });
        if (!u) {
          const firstAdmin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
          createdById = firstAdmin?.id || null;
        }
      }

      restoredEntity = await prisma.incident.create({
        data: {
          incidentNumber: incidentNumber || `INC-${Date.now()}`,
          title: snapshot.title || trashItem.entityName,
          description: snapshot.description || '(Khôi phục từ Thùng rác)',
          severity: snapshot.severity || 'MEDIUM_P3',
          status: 'INVESTIGATING',
          createdById: createdById!,
          impact: snapshot.impact || null,
          workaround: snapshot.workaround || null,
        },
      });
      break;
    }

    case 'PROBLEM': {
      let problemNumber = snapshot.problemNumber;
      if (problemNumber) {
        const exists = await prisma.problem.findUnique({ where: { problemNumber } });
        if (exists) {
          problemNumber = `${problemNumber}-R${Date.now().toString().slice(-4)}`;
        }
      }
      let createdById = snapshot.createdById || currentUserId || trashItem.deletedById;
      if (createdById) {
        const u = await prisma.user.findUnique({ where: { id: createdById } });
        if (!u) {
          const firstAdmin = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
          createdById = firstAdmin?.id || null;
        }
      }

      restoredEntity = await prisma.problem.create({
        data: {
          problemNumber: problemNumber || `PRB-${Date.now()}`,
          title: snapshot.title || trashItem.entityName,
          description: snapshot.description || '(Khôi phục từ Thùng rác)',
          status: 'OPEN',
          priority: snapshot.priority || 'MEDIUM',
          createdById: createdById!,
          rootCause: snapshot.rootCause || null,
          workaround: snapshot.workaround || null,
          permanentSolution: snapshot.permanentSolution || null,
        },
      });
      break;
    }

    case 'CATEGORY': {
      const categoryType = snapshot.categoryType || 'ASSET';
      if (categoryType === 'LICENSE') {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'categories.license' },
        });
        let list: any[] = [];
        if (setting && setting.value) {
          try {
            list = JSON.parse(setting.value);
          } catch {
            list = [];
          }
        }
        const exists = list.some((c: any) => c.id === (snapshot.id || trashItem.entityId));
        if (!exists) {
          list.push({
            id: snapshot.id || trashItem.entityId,
            name: snapshot.name || trashItem.entityName,
            icon: snapshot.icon || '🔑',
            description: snapshot.description || '',
            customFields: snapshot.customFields || [],
          });
          await prisma.systemSetting.upsert({
            where: { key: 'categories.license' },
            create: {
              key: 'categories.license',
              value: JSON.stringify(list),
              type: 'JSON',
              group: 'general',
              label: 'Danh mục bản quyền phần mềm',
            },
            update: { value: JSON.stringify(list) },
          });
        }
        restoredEntity = { id: snapshot.id || trashItem.entityId, name: snapshot.name };
      } else if (categoryType === 'SERVICE') {
        const setting = await prisma.systemSetting.findUnique({
          where: { key: 'categories.service' },
        });
        let list: any[] = [];
        if (setting && setting.value) {
          try {
            list = JSON.parse(setting.value);
          } catch {
            list = [];
          }
        }
        const exists = list.some((c: any) => c.id === (snapshot.id || trashItem.entityId));
        if (!exists) {
          list.push({
            id: snapshot.id || trashItem.entityId,
            name: snapshot.name || trashItem.entityName,
            icon: snapshot.icon || '💼',
            serviceType: snapshot.serviceType || 'OTHER',
            description: snapshot.description || '',
            customFields: snapshot.customFields || [],
          });
          await prisma.systemSetting.upsert({
            where: { key: 'categories.service' },
            create: {
              key: 'categories.service',
              value: JSON.stringify(list),
              type: 'JSON',
              group: 'general',
              label: 'Danh mục dịch vụ IT & Thuê bao',
            },
            update: { value: JSON.stringify(list) },
          });
        }
        restoredEntity = { id: snapshot.id || trashItem.entityId, name: snapshot.name };
      } else {
        // ASSET CATEGORY (Prisma model AssetCategory)
        const existingCategory = await prisma.assetCategory.findUnique({
          where: { id: trashItem.entityId },
        });

        if (existingCategory) {
          restoredEntity = await prisma.assetCategory.update({
            where: { id: existingCategory.id },
            data: { isActive: true },
          });
        } else {
          let parentId = snapshot.parentId;
          if (parentId) {
            const p = await prisma.assetCategory.findUnique({ where: { id: parentId } });
            if (!p) parentId = null;
          }

          let targetId: string | undefined = undefined;
          if (snapshot.id) {
            const idExists = await prisma.assetCategory.findUnique({ where: { id: snapshot.id } });
            if (!idExists) targetId = snapshot.id;
          }

          restoredEntity = await prisma.assetCategory.create({
            data: {
              ...(targetId ? { id: targetId } : {}),
              name: snapshot.name || trashItem.entityName,
              description: snapshot.description || null,
              icon: snapshot.icon || null,
              parentId,
              customFields: snapshot.customFields || undefined,
              isActive: true,
            },
          });
        }
      }
      break;
    }

    case 'VENDOR': {
      const existingVendor = await prisma.vendor.findUnique({
        where: { id: trashItem.entityId },
      });

      if (existingVendor) {
        restoredEntity = await prisma.vendor.update({
          where: { id: existingVendor.id },
          data: { isActive: true },
        });
      } else {
        let targetId: string | undefined = undefined;
        if (snapshot.id) {
          const idExists = await prisma.vendor.findUnique({ where: { id: snapshot.id } });
          if (!idExists) targetId = snapshot.id;
        }

        restoredEntity = await prisma.vendor.create({
          data: {
            ...(targetId ? { id: targetId } : {}),
            name: snapshot.name || trashItem.entityName,
            contactPerson: snapshot.contactPerson || null,
            email: snapshot.email || null,
            phone: snapshot.phone || null,
            address: snapshot.address || null,
            website: snapshot.website || null,
            notes: snapshot.notes ? `${snapshot.notes} (Đã khôi phục)` : '(Đã khôi phục)',
            isActive: true,
          },
        });
      }
      break;
    }

    default:
      throw new Error(`Chưa hỗ trợ khôi phục đối tượng loại "${trashItem.entityType}"`);
  }

  // Xóa khỏi thùng rác sau khi khôi phục thành công
  await prisma.trashItem.delete({
    where: { id: trashId },
  });

  // Ghi Audit Log nếu có currentUserId
  if (currentUserId) {
    await createAuditLog({
      action: 'CREATE',
      entityType: trashItem.entityType,
      entityId: restoredEntity?.id || trashItem.entityId,
      userId: currentUserId,
      changes: { restoredFromTrash: { originalId: trashItem.entityId, name: trashItem.entityName } },
    });
  }

  return { success: true, restoredEntity };
}
