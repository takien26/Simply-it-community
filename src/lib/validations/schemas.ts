import { z } from 'zod';

// ==================== ASSET SCHEMAS ====================

export const assetCreateSchema = z.object({
  assetTag: z.string().min(1, 'Mã tài sản là bắt buộc'),
  name: z.string().min(1, 'Tên tài sản là bắt buộc'),
  categoryId: z.string().uuid('Category ID không hợp lệ'),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  serialNumber: z.string().optional().nullable(),
  status: z.enum(['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST']).default('AVAILABLE'),
  condition: z.enum(['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN']).default('NEW'),
  purchaseDate: z.string().datetime().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  purchaseCurrency: z.string().default('VND'),
  warrantyExpiry: z.string().datetime().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  specs: z.record(z.unknown()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const assetUpdateSchema = assetCreateSchema.partial().omit({ assetTag: true });

export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;

// ==================== LICENSE SCHEMAS ====================

export const licenseCreateSchema = z.object({
  name: z.string().min(1, 'Tên phần mềm là bắt buộc'),
  licenseKey: z.string().optional().nullable(),
  licenseType: z.enum(['PERPETUAL', 'SUBSCRIPTION', 'OEM', 'TRIAL', 'OPEN_SOURCE']).default('PERPETUAL'),
  totalSeats: z.number().int().positive().default(1),
  purchaseDate: z.string().datetime().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  purchasePrice: z.number().positive().optional().nullable(),
  purchaseCurrency: z.string().default('VND'),
  vendorId: z.string().uuid().optional().nullable(),
  contractUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const licenseUpdateSchema = licenseCreateSchema.partial();

export type LicenseCreateInput = z.infer<typeof licenseCreateSchema>;
export type LicenseUpdateInput = z.infer<typeof licenseUpdateSchema>;

// ==================== MAINTENANCE SCHEMAS ====================

export const maintenanceCreateSchema = z.object({
  assetId: z.string().uuid('Asset ID là bắt buộc'),
  type: z.enum(['REPAIR', 'UPGRADE', 'INSPECTION', 'CLEANING', 'SOFTWARE_UPDATE', 'REPLACEMENT', 'OTHER']),
  title: z.string().min(1, 'Tiêu đề là bắt buộc'),
  description: z.string().optional().nullable(),
  performedById: z.string().uuid().optional().nullable(),
  vendorId: z.string().uuid().optional().nullable(),
  cost: z.number().positive().optional().nullable(),
  costCurrency: z.string().default('VND'),
  performedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const maintenanceUpdateSchema = maintenanceCreateSchema.partial().omit({ assetId: true });

export type MaintenanceCreateInput = z.infer<typeof maintenanceCreateSchema>;
export type MaintenanceUpdateInput = z.infer<typeof maintenanceUpdateSchema>;

// ==================== AI EXTRACTION SCHEMAS ====================

export const aiExtractSchema = z.object({
  inputType: z.enum(['IMAGE', 'PDF', 'TEXT']),
  targetEntity: z.enum(['ASSET', 'LICENSE', 'MAINTENANCE', 'VENDOR']),
  inputText: z.string().optional(),
  templateId: z.string().uuid().optional(),
});

export const aiConfirmSchema = z.object({
  action: z.enum(['confirm', 'reject']),
  editedData: z.record(z.unknown()).optional(),
});

// ==================== USER SCHEMAS ====================

export const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

export const userCreateSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  fullName: z.string().min(1, 'Họ tên là bắt buộc'),
  roleId: z.string().uuid('Role ID không hợp lệ'),
  department: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

// ==================== VENDOR SCHEMAS ====================

export const vendorCreateSchema = z.object({
  name: z.string().min(1, 'Tên nhà cung cấp là bắt buộc'),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  website: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ==================== CATEGORY SCHEMAS ====================

export const categoryCreateSchema = z.object({
  name: z.string().min(1, 'Tên danh mục là bắt buộc'),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

// ==================== IMPORT SCHEMAS ====================

export const importSchema = z.object({
  importType: z.enum(['ASSET', 'LICENSE']),
});
