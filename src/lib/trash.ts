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
  entityType: 'ASSET' | 'USER' | 'LICENSE' | 'TICKET' | 'DOCUMENT' | 'SPARE_PART' | 'VENDOR' | 'CATEGORY';
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
      // Kiểm tra trùng lặp assetTag
      let assetTag = snapshot.assetTag;
      if (assetTag) {
        const existingTag = await prisma.asset.findUnique({ where: { assetTag } });
        if (existingTag) {
          assetTag = `${assetTag}-RESTORED-${Date.now().toString().slice(-4)}`;
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

      restoredEntity = await prisma.asset.create({
        data: {
          assetTag: assetTag || `TAG-${Date.now()}`,
          name: snapshot.name || trashItem.entityName,
          model: snapshot.model || null,
          serialNumber: snapshot.serialNumber || null,
          status: 'AVAILABLE',
          condition: snapshot.condition || 'GOOD',
          purchaseDate: snapshot.purchaseDate ? new Date(snapshot.purchaseDate) : null,
          purchaseCost: snapshot.purchaseCost !== undefined && snapshot.purchaseCost !== null ? snapshot.purchaseCost : null,
          currency: snapshot.currency || 'VND',
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

        restoredEntity = await prisma.user.create({
          data: {
            fullName: snapshot.fullName || trashItem.entityName,
            email: snapshot.email,
            password: snapshot.password || '$2a$10$defaultHashPlaceholder',
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
      let vendorId = snapshot.vendorId;
      if (vendorId) {
        const v = await prisma.vendor.findUnique({ where: { id: vendorId } });
        if (!v) vendorId = null;
      }

      restoredEntity = await prisma.license.create({
        data: {
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

      restoredEntity = await prisma.ticket.create({
        data: {
          ticketNumber: ticketNumber || `TK-${Date.now()}`,
          title: snapshot.title || trashItem.entityName,
          description: snapshot.description || '(Khôi phục từ Thùng rác)',
          category: snapshot.category || 'HARDWARE',
          priority: snapshot.priority || 'MEDIUM',
          status: 'OPEN',
          createdById: snapshot.createdById || currentUserId || trashItem.deletedById,
          companyName: snapshot.companyName || null,
        },
      });
      break;
    }

    case 'DOCUMENT': {
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
