export interface CloudSubscriptionSku {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  totalPrepaid: number;
  consumed: number;
  available: number;
  expiryDate?: string;
  unitPriceEstimate?: number;
  currency?: string;
}

export interface CloudAssignedUser {
  id: string;
  email: string;
  displayName: string;
  accountEnabled: boolean;
  assignedSkuNames: string[];
  assignedSkuIds?: string[];
  lastSignInDate?: string;
  daysInactive?: number;
  isDormant?: boolean; // > 45 ngày không đăng nhập
  department?: string;
  jobTitle?: string;
  userPrincipalName?: string;
  mail?: string;
}

export interface ReconciliationReport {
  provider: 'm365' | 'google' | 'adobe';
  providerName: string;
  syncedAt: string;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  message?: string;
  isDemoMode?: boolean;
  skus: CloudSubscriptionSku[];
  totalCloudSeats: number;
  totalCloudConsumed: number;
  totalLocalSeats: number;
  totalLocalConsumed: number;
  discrepancies: {
    skuName: string;
    cloudTotal: number;
    cloudConsumed: number;
    localTotal: number;
    localConsumed: number;
    diff: number;
    status: 'MATCH' | 'SURPLUS_ON_CLOUD' | 'OVER_ALLOCATED_LOCALLY';
  }[];
  dormantUsers: CloudAssignedUser[]; // Tài khoản lãng phí: disabled hoặc > 45 ngày không đăng nhập
  unmatchedUsers: CloudAssignedUser[]; // Có trên Cloud nhưng chưa được ghi nhận trong Simply IT
  cloudUsers?: CloudAssignedUser[]; // Toàn bộ người dùng trên Cloud có gán license
  estimatedPotentialSavings: number; // Ước tính số tiền tiết kiệm được nếu thu hồi các tài khoản lãng phí
  currency: string;
  subscriptions?: M365SubscriptionBatch[];
}

export interface M365SubscriptionBatch {
  id: string;
  commerceSubscriptionId: string;
  skuId: string;
  skuPartNumber: string;
  status: string;
  totalLicenses: number;
  createdDateTime: string;
  nextLifecycleDateTime: string | null;
  isTrial: boolean;
}

export interface M365Config {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  isDemoMode?: boolean;
  autoSyncEnabled?: boolean;
  syncIntervalHours?: number;
  lastSyncedAt?: string;
}

export interface GoogleWorkspaceConfig {
  serviceAccountEmail: string;
  adminEmail: string;
  privateKey: string;
  isDemoMode?: boolean;
  autoSyncEnabled?: boolean;
  lastSyncedAt?: string;
}

export interface AdobeConfig {
  clientId: string;
  clientSecret: string;
  orgId: string;
  isDemoMode?: boolean;
  autoSyncEnabled?: boolean;
  lastSyncedAt?: string;
}

export interface IntegrationsConfig {
  m365: M365Config;
  google?: GoogleWorkspaceConfig;
  adobe?: AdobeConfig;
}
