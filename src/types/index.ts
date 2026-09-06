import type {
  User,
  Role,
  Asset,
  AssetCategory,
  License,
  Vendor,
  Location,
  AssetAssignment,
  LicenseAssignment,
  AssetMaintenanceLog,
  AuditLog,
  AIExtraction,
  AIExtractionTemplate,
  SystemSetting,
  ImportBatch,
  ImportRecord,
} from '@prisma/client';

// Re-export Prisma types
export type {
  User,
  Role,
  Asset,
  AssetCategory,
  License,
  Vendor,
  Location,
  AssetAssignment,
  LicenseAssignment,
  AssetMaintenanceLog,
  AuditLog,
  AIExtraction,
  AIExtractionTemplate,
  SystemSetting,
  ImportBatch,
  ImportRecord,
};

// Extended types with relations
export interface UserWithRole extends User {
  role: Role;
}

export interface AssetWithRelations extends Asset {
  category: AssetCategory;
  vendor: Vendor | null;
  location: Location | null;
  assignments: (AssetAssignment & { user: User })[];
  maintenanceLogs: AssetMaintenanceLog[];
}

export interface LicenseWithRelations extends License {
  vendor: Vendor | null;
  assignments: (LicenseAssignment & {
    user: User | null;
    asset: Asset | null;
  })[];
}

export interface CategoryWithChildren extends AssetCategory {
  children: CategoryWithChildren[];
  _count?: { assets: number };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// AI Extraction types
export interface AIExtractionResult {
  extractedData: Record<string, unknown>;
  confidence: number;
  targetEntity: string;
}

export interface AITemplateField {
  type: 'string' | 'number' | 'date' | 'boolean' | 'object' | 'enum';
  label: string;
  required?: boolean;
  values?: string[];
}

// Dashboard stats
export interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  inUseAssets: number;
  maintenanceAssets: number;
  totalLicenses: number;
  activeLicenses: number;
  expiringSoonLicenses: number;
  recentActivities: AuditLog[];
}
