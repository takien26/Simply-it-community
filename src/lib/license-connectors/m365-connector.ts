import { prisma } from '@/lib/db';
import {
  M365Config,
  CloudSubscriptionSku,
  CloudAssignedUser,
  ReconciliationReport,
} from './types';

// Map các mã SKU chuẩn của Microsoft sang tên thương mại quen thuộc
const M365_SKU_NAMES: Record<string, { name: string; estMonthlyPriceVnd: number }> = {
  O365_BUSINESS_ESSENTIALS: { name: 'Microsoft 365 Business Basic', estMonthlyPriceVnd: 75000 },
  O365_BUSINESS_PREMIUM: { name: 'Microsoft 365 Business Standard', estMonthlyPriceVnd: 285000 },
  SPB: { name: 'Microsoft 365 Business Premium', estMonthlyPriceVnd: 510000 },
  SMB_BUSINESS: { name: 'Microsoft 365 Apps for business', estMonthlyPriceVnd: 195000 },
  STANDARDPACK: { name: 'Office 365 E1', estMonthlyPriceVnd: 190000 },
  ENTERPRISEPACK: { name: 'Office 365 E3', estMonthlyPriceVnd: 560000 },
  ENTERPRISEPREMIUM: { name: 'Office 365 E5', estMonthlyPriceVnd: 950000 },
  SPE_E3: { name: 'Microsoft 365 E3', estMonthlyPriceVnd: 850000 },
  SPE_E5: { name: 'Microsoft 365 E5', estMonthlyPriceVnd: 1400000 },
  EXCHANGESTANDARD: { name: 'Exchange Online (Plan 1)', estMonthlyPriceVnd: 95000 },
  VISIOPRO: { name: 'Visio Plan 2', estMonthlyPriceVnd: 360000 },
  PROJECTPREMIUM: { name: 'Project Plan 3', estMonthlyPriceVnd: 720000 },
  TEAMS_EXPLORATORY: { name: 'Microsoft Teams Exploratory', estMonthlyPriceVnd: 0 },
  POWER_BI_PRO: { name: 'Power BI Pro', estMonthlyPriceVnd: 240000 },
};

/**
 * Kiểm tra kết nối tới Microsoft Graph API
 */
export async function testM365Connection(config: M365Config): Promise<{ success: boolean; message: string }> {
  if (config.isDemoMode || !config.tenantId || !config.clientId || !config.clientSecret) {
    return {
      success: true,
      message: 'Kết nối chế độ Thử nghiệm (Simulation Mode) thành công. Dữ liệu mẫu M365 sẵn sàng!',
    };
  }

  try {
    const token = await getGraphAccessToken(config);
    if (!token) {
      return { success: false, message: 'Xác thực OAuth2 thất bại: Kiểm tra lại Tenant ID, Client ID hoặc Secret!' };
    }

    const res = await fetch('https://graph.microsoft.com/v1.0/organization?$select=id,displayName', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, message: `Lỗi Microsoft Graph API: ${res.status} ${errText}` };
    }

    const data = await res.json();
    const orgName = data?.value?.[0]?.displayName || 'Microsoft 365 Tenant';
    return { success: true, message: `Kết nối thành công tới Tenant: "${orgName}"!` };
  } catch (err: any) {
    return { success: false, message: `Lỗi kết nối: ${err?.message || 'Không thể liên lạc máy chủ Microsoft'}` };
  }
}

/**
 * Lấy Bearer Token từ Microsoft Azure AD (OAuth2 Client Credentials)
 */
async function getGraphAccessToken(config: M365Config): Promise<string | null> {
  const tokenEndpoint = `https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams();
  body.append('client_id', config.clientId);
  body.append('client_secret', config.clientSecret);
  body.append('scope', 'https://graph.microsoft.com/.default');
  body.append('grant_type', 'client_credentials');

  const res = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    console.error('Lỗi lấy OAuth2 Token từ Microsoft:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.access_token || null;
}

/**
 * Chạy đồng bộ và tạo Báo Cáo Đối Soát Bản Quyền Microsoft 365
 */
export async function syncAndReconcileM365(config: M365Config): Promise<ReconciliationReport> {
  let isDemo = Boolean(config.isDemoMode || !config.tenantId || !config.clientId || !config.clientSecret);
  let skus: CloudSubscriptionSku[] = [];
  let cloudUsers: CloudAssignedUser[] = [];

  if (!isDemo) {
    try {
      const token = await getGraphAccessToken(config);
      if (!token) throw new Error('Không thể lấy Token xác thực từ Microsoft');

      // 1. Lấy danh sách Subscribed SKUs
      const skuRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (skuRes.ok) {
        const skuData = await skuRes.json();
        const rawSkus = Array.isArray(skuData?.value) ? skuData.value : [];
        skus = rawSkus.map((s: any) => {
          const partNo = s.skuPartNumber || '';
          const mapped = M365_SKU_NAMES[partNo] || { name: partNo, estMonthlyPriceVnd: 250000 };
          const total = Number(s.prepaidUnits?.enabled) || 0;
          const consumed = Number(s.consumedUnits) || 0;
          return {
            skuId: s.skuId,
            skuPartNumber: partNo,
            displayName: mapped.name,
            totalPrepaid: total,
            consumed: consumed,
            available: Math.max(0, total - consumed),
            unitPriceEstimate: mapped.estMonthlyPriceVnd,
            currency: 'VND',
          };
        });
      }

      // 2. Lấy danh sách người dùng được gán bản quyền
      const userRes = await fetch(
        'https://graph.microsoft.com/v1.0/users?$select=id,displayName,userPrincipalName,mail,accountEnabled,assignedLicenses,signInActivity,department,jobTitle&$top=999',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (userRes.ok) {
        const userData = await userRes.json();
        const rawUsers = Array.isArray(userData?.value) ? userData.value : [];
        const now = new Date().getTime();

        cloudUsers = rawUsers
          .filter((u: any) => Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0)
          .map((u: any) => {
            const lastSignInStr = u.signInActivity?.lastSignInDateTime || null;
            let daysInactive = 0;
            if (lastSignInStr) {
              const diffMs = now - new Date(lastSignInStr).getTime();
              daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            } else {
              daysInactive = 90; // Không có log đăng nhập coi như > 90 ngày
            }

            const assignedNames = (u.assignedLicenses || []).map((asg: any) => {
              const foundSku = skus.find((s) => s.skuId === asg.skuId);
              return foundSku ? foundSku.displayName : asg.skuId;
            });

            const isDormant = !u.accountEnabled || daysInactive >= 45;

            return {
              id: u.id,
              email: u.userPrincipalName || u.mail || '',
              displayName: u.displayName || u.userPrincipalName || 'User',
              accountEnabled: Boolean(u.accountEnabled),
              assignedSkuNames: assignedNames,
              lastSignInDate: lastSignInStr,
              daysInactive,
              isDormant,
              department: u.department || '',
              jobTitle: u.jobTitle || '',
            };
          });
      }
    } catch (err) {
      console.warn('Không thể kết nối thực tế tới Microsoft Graph API, tự động kích hoạt Demo Mode:', err);
      isDemo = true;
    }
  }

  // Dữ liệu mẫu Demo chân thực (khi không có API Secret)
  if (isDemo || skus.length === 0) {
    isDemo = true;
    skus = [
      {
        skuId: 'sku-m365-bs',
        skuPartNumber: 'O365_BUSINESS_PREMIUM',
        displayName: 'Microsoft 365 Business Standard',
        totalPrepaid: 100,
        consumed: 88,
        available: 12,
        unitPriceEstimate: 285000,
        currency: 'VND',
      },
      {
        skuId: 'sku-m365-e3',
        skuPartNumber: 'ENTERPRISEPACK',
        displayName: 'Office 365 E3',
        totalPrepaid: 25,
        consumed: 22,
        available: 3,
        unitPriceEstimate: 560000,
        currency: 'VND',
      },
      {
        skuId: 'sku-m365-bb',
        skuPartNumber: 'O365_BUSINESS_ESSENTIALS',
        displayName: 'Microsoft 365 Business Basic',
        totalPrepaid: 50,
        consumed: 41,
        available: 9,
        unitPriceEstimate: 75000,
        currency: 'VND',
      },
    ];

    cloudUsers = [
      {
        id: 'usr-demo-1',
        email: 'tran.van.b@congty.com',
        displayName: 'Trần Văn B (Đã Nghỉ Việc)',
        accountEnabled: false, // Tài khoản đã bị IT khóa nhưng quên gỡ license
        assignedSkuNames: ['Microsoft 365 Business Standard'],
        lastSignInDate: '2026-06-15T08:00:00Z',
        daysInactive: 94,
        isDormant: true,
        department: 'Kinh Doanh',
        jobTitle: 'Chuyên viên Sales',
      },
      {
        id: 'usr-demo-2',
        email: 'nguyen.thi.c@congty.com',
        displayName: 'Nguyễn Thị C',
        accountEnabled: true,
        assignedSkuNames: ['Office 365 E3'],
        lastSignInDate: '2026-07-20T10:30:00Z',
        daysInactive: 59, // > 45 ngày không đăng nhập
        isDormant: true,
        department: 'Hành Chính',
        jobTitle: 'Nhân viên lễ tân',
      },
      {
        id: 'usr-demo-3',
        email: 'le.hoang.d@congty.com',
        displayName: 'Lê Hoàng D (Thử Việc Không Đạt)',
        accountEnabled: false,
        assignedSkuNames: ['Microsoft 365 Business Standard'],
        lastSignInDate: '2026-07-01T09:00:00Z',
        daysInactive: 78,
        isDormant: true,
        department: 'Marketing',
        jobTitle: 'Designer',
      },
      {
        id: 'usr-demo-4',
        email: 'pham.quang.e@congty.com',
        displayName: 'Phạm Quang E',
        accountEnabled: true,
        assignedSkuNames: ['Microsoft 365 Business Basic'],
        lastSignInDate: '2026-09-16T14:20:00Z',
        daysInactive: 1,
        isDormant: false,
        department: 'Công Nghệ Thông Tin',
        jobTitle: 'IT Helpdesk',
      },
    ];
  }

  // 3. ĐỐI SOÁT VỚI CƠ SỞ DỮ LIỆU NỘI BỘ (SIMPLY IT DATABASE)
  const localLicenses = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: '365', mode: 'insensitive' } },
        { name: { contains: 'Microsoft', mode: 'insensitive' } },
        { name: { contains: 'Office', mode: 'insensitive' } },
      ],
    },
    include: {
      assignments: {
        where: { revokedAt: null },
        include: { user: true },
      },
      batches: {
        include: {
          assignments: {
            where: { revokedAt: null },
            include: { user: true },
          },
        },
      },
    },
  });

  // Tính tổng local seats
  let totalLocalSeats = 0;
  let totalLocalConsumed = 0;
  const localAssignedEmails = new Set<string>();

  localLicenses.forEach((lic) => {
    totalLocalSeats += lic.totalSeats || 1;
    lic.assignments.forEach((asg) => {
      totalLocalConsumed += 1;
      if (asg.user?.email) localAssignedEmails.add(asg.user.email.toLowerCase().trim());
    });
    if (Array.isArray(lic.batches)) {
      lic.batches.forEach((b) => {
        totalLocalSeats += b.totalSeats || 0;
        b.assignments?.forEach((asg) => {
          totalLocalConsumed += 1;
          if (asg.user?.email) localAssignedEmails.add(asg.user.email.toLowerCase().trim());
        });
      });
    }
  });

  const totalCloudSeats = skus.reduce((sum, s) => sum + s.totalPrepaid, 0);
  const totalCloudConsumed = skus.reduce((sum, s) => sum + s.consumed, 0);

  // Tìm các tài khoản trên Cloud nhưng chưa gán trong Simply IT
  const unmatchedUsers = cloudUsers.filter((cu) => {
    return cu.email && !localAssignedEmails.has(cu.email.toLowerCase().trim());
  });

  // Tìm các tài khoản ngủ đông (Dormant)
  const dormantUsers = cloudUsers.filter((cu) => cu.isDormant);

  // Tính ước tính số tiền tiết kiệm hàng tháng nếu thu hồi các license ngủ đông
  let estimatedPotentialSavings = 0;
  dormantUsers.forEach((du) => {
    du.assignedSkuNames.forEach((name) => {
      const matchSku = skus.find((s) => s.displayName === name);
      estimatedPotentialSavings += matchSku?.unitPriceEstimate || 250000;
    });
  });

  // Bảng đối soát từng SKU
  const discrepancies = skus.map((sku) => {
    // Tìm license nội bộ tương ứng theo tên
    const matchedLocal = localLicenses.filter(
      (l) => l.name.toLowerCase().includes(sku.displayName.toLowerCase()) || sku.displayName.toLowerCase().includes(l.name.toLowerCase())
    );
    let locTotal = 0;
    let locConsumed = 0;
    matchedLocal.forEach((l) => {
      locTotal += l.totalSeats || 1;
      locConsumed += l.assignments.length;
    });

    const diff = sku.consumed - locConsumed;
    return {
      skuName: sku.displayName,
      cloudTotal: sku.totalPrepaid,
      cloudConsumed: sku.consumed,
      localTotal: locTotal || sku.totalPrepaid,
      localConsumed: locConsumed,
      diff,
      status: diff === 0 ? ('MATCH' as const) : diff > 0 ? ('SURPLUS_ON_CLOUD' as const) : ('OVER_ALLOCATED_LOCALLY' as const),
    };
  });

  return {
    provider: 'm365',
    providerName: 'Microsoft 365 (Azure AD / Graph API)',
    syncedAt: new Date().toISOString(),
    status: dormantUsers.length > 0 || Math.abs(totalCloudConsumed - totalLocalConsumed) > 0 ? 'WARNING' : 'SUCCESS',
    message: isDemo
      ? 'Đã đồng bộ ở chế độ Mô phỏng / Dữ liệu Mẫu (Demo Mode).'
      : 'Đã kết nối và đồng bộ trực tiếp với Microsoft 365 Tenant thành công.',
    isDemoMode: isDemo,
    skus,
    totalCloudSeats,
    totalCloudConsumed,
    totalLocalSeats,
    totalLocalConsumed,
    discrepancies,
    dormantUsers,
    unmatchedUsers,
    estimatedPotentialSavings,
    currency: 'VND',
  };
}
