import { prisma } from '@/lib/db';
import {
  M365Config,
  CloudSubscriptionSku,
  CloudAssignedUser,
  ReconciliationReport,
  M365SubscriptionBatch,
} from './types';

// Map các mã SKU chuẩn của Microsoft và GUID sang tên thương mại quen thuộc
export const M365_SKU_CATALOG: Record<string, { name: string; estMonthlyPriceVnd: number }> = {
  // Mã Part Number chuẩn
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
  EXCHANGEENTERPRISE: { name: 'Exchange Online (Plan 2)', estMonthlyPriceVnd: 190000 },
  VISIOCLIENT: { name: 'Visio Plan 2', estMonthlyPriceVnd: 360000 },
  VISIOPRO: { name: 'Visio Plan 2', estMonthlyPriceVnd: 360000 },
  PROJECTPREMIUM: { name: 'Project Plan 3', estMonthlyPriceVnd: 720000 },
  PROJECTPROFESSIONAL: { name: 'Project Plan 3', estMonthlyPriceVnd: 720000 },
  PROJECT_P1: { name: 'Project Plan 1', estMonthlyPriceVnd: 240000 },
  POWER_BI_PRO: { name: 'Power BI Pro', estMonthlyPriceVnd: 240000 },
  POWER_BI_STANDARD: { name: 'Power BI (Free)', estMonthlyPriceVnd: 0 },
  FLOW_FREE: { name: 'Microsoft Power Automate Free', estMonthlyPriceVnd: 0 },
  TEAMS_ESSENTIALS: { name: 'Microsoft Teams Essentials', estMonthlyPriceVnd: 95000 },
  TEAMS_ROOMS_BASIC: { name: 'Microsoft Teams Rooms Basic', estMonthlyPriceVnd: 0 },
  TEAMS_ROOMS_PRO: { name: 'Microsoft Teams Rooms Pro', estMonthlyPriceVnd: 950000 },
  M365_COPILOT: { name: 'Microsoft 365 Copilot', estMonthlyPriceVnd: 750000 },
  EMSPREMIUM: { name: 'Enterprise Mobility + Security E5', estMonthlyPriceVnd: 380000 },
  POWERAPPS_DEV: { name: 'Microsoft Power Apps for Developer', estMonthlyPriceVnd: 0 },

  // Mã GUID SKU thực tế (từ Microsoft Entra ID)
  'f245ecc8-75af-4f8e-b61f-27d8114de5f3': { name: 'Microsoft 365 Business Standard', estMonthlyPriceVnd: 285000 },
  'f30db892-07e9-47e9-837c-80727f46fd3d': { name: 'Microsoft Power Automate Free', estMonthlyPriceVnd: 0 },
  'b05e124f-c7cc-45a0-a6aa-8cf78c946968': { name: 'Enterprise Mobility + Security E5', estMonthlyPriceVnd: 380000 },
  'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235': { name: 'Power BI (Free)', estMonthlyPriceVnd: 0 },
  '53818b1b-4a27-454b-8896-0dba576410e6': { name: 'Project Plan 3', estMonthlyPriceVnd: 720000 },
  '4b9405b0-7788-4568-add1-99614e613b69': { name: 'Exchange Online (Plan 1)', estMonthlyPriceVnd: 95000 },
  '3b555118-da6a-4418-894f-7df1e2096870': { name: 'Microsoft 365 Business Basic', estMonthlyPriceVnd: 75000 },
  '3ab6abff-666f-4424-bfb7-f0bc274ec7bc': { name: 'Microsoft Teams Essentials', estMonthlyPriceVnd: 95000 },
  '5a1c7b8d-0739-4ca8-bf69-ec87e69133ac': { name: 'Microsoft 365 Business Standard (no Teams)', estMonthlyPriceVnd: 260000 },
  'beb6439c-caad-48d3-bf46-0c82871e12be': { name: 'Project Plan 1', estMonthlyPriceVnd: 240000 },
  'c5928f49-12ba-48f7-ada3-0d743a3601d5': { name: 'Visio Plan 2', estMonthlyPriceVnd: 360000 },
  'f8a1db68-be16-40ed-86d5-cb42ce701560': { name: 'Power BI Pro', estMonthlyPriceVnd: 240000 },
  '5b631642-bd26-49fe-bd20-1daaa972ef80': { name: 'Microsoft Power Apps for Developer', estMonthlyPriceVnd: 0 },
  '639dec6b-bb19-468b-871c-c5c441c4b0cb': { name: 'Microsoft 365 Copilot', estMonthlyPriceVnd: 750000 },
  '606b54a9-78d8-4298-ad8b-df6ef4481c80': { name: 'Power Virtual Agents Trial', estMonthlyPriceVnd: 0 },
  '6af4b3d6-14bb-4a2a-960c-6c902aad34f3': { name: 'Microsoft Teams Rooms Basic', estMonthlyPriceVnd: 0 },
  '4cde982a-ede4-4409-9ae6-b003453c8ea6': { name: 'Microsoft Teams Rooms Pro', estMonthlyPriceVnd: 950000 },
  'dcb1a3ae-b33f-4487-846a-a640262fadf4': { name: 'Microsoft Power Apps Plan 2 Trial', estMonthlyPriceVnd: 0 },
  '46102f44-d912-47e7-b0ca-1bd7b70ada3b': { name: 'Project Plan 3 (Dept)', estMonthlyPriceVnd: 720000 },
  '3f9f06f5-3c31-472c-985f-62d9c10ec167': { name: 'Power Pages Maker Trial', estMonthlyPriceVnd: 0 },
  '6ec92958-3cc1-49db-95bd-bc6b3798df71': { name: 'Dynamics 365 Sales Premium Trial', estMonthlyPriceVnd: 0 },
  'c9a0aa67-747d-4dbf-a9ae-844575460a44': { name: 'Microsoft 365 Additional Service', estMonthlyPriceVnd: 100000 },
};

const M365_SKU_NAMES = M365_SKU_CATALOG;

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
 * Lấy danh sách từng đợt mua subscription (companySubscription) từ Microsoft Graph
 * Yêu cầu quyền: Directory.Read.All
 */
export async function fetchM365Subscriptions(token: string): Promise<M365SubscriptionBatch[]> {
  try {
    const res = await fetch('https://graph.microsoft.com/v1.0/directory/subscriptions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn('Microsoft Graph /directory/subscriptions trả về status:', res.status);
      return [];
    }
    const data = await res.json();
    const rawSubs = Array.isArray(data?.value) ? data.value : [];
    return rawSubs.map((sub: any) => ({
      id: sub.id,
      commerceSubscriptionId: sub.commerceSubscriptionId || sub.id,
      skuId: sub.skuId,
      skuPartNumber: sub.skuPartNumber || '',
      status: sub.status || 'Enabled',
      totalLicenses: Number(sub.totalLicenses) || 0,
      createdDateTime: sub.createdDateTime,
      nextLifecycleDateTime: sub.nextLifecycleDateTime || null,
      isTrial: Boolean(sub.isTrial),
    }));
  } catch (err) {
    console.warn('Lỗi khi gọi /directory/subscriptions:', err);
    return [];
  }
}

/**
 * Chạy đồng bộ và tạo Báo Cáo Đối Soát Bản Quyền Microsoft 365
 */
export async function syncAndReconcileM365(config: M365Config): Promise<ReconciliationReport> {
  const hasCredentials = Boolean(config.tenantId && config.clientId && config.clientSecret);
  let isDemo = Boolean(config.isDemoMode || !hasCredentials);
  let skus: CloudSubscriptionSku[] = [];
  let subscriptions: M365SubscriptionBatch[] = [];
  let cloudUsers: CloudAssignedUser[] = [];
  let syncWarning: string | null = null;

  if (!isDemo) {
    try {
      const token = await getGraphAccessToken(config);
      if (!token) throw new Error('Không thể lấy OAuth2 Token từ Microsoft. Vui lòng kiểm tra Tenant ID, Client ID hoặc Client Secret.');

      // 1. Thử lấy danh sách Subscribed SKUs
      try {
        const skuRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (skuRes.ok) {
          const skuData = await skuRes.json();
          const rawSkus = Array.isArray(skuData?.value) ? skuData.value : [];
          skus = rawSkus.map((s: any) => {
            const partNo = s.skuPartNumber || '';
            const mapped = M365_SKU_CATALOG[partNo] || M365_SKU_CATALOG[s.skuId] || { name: partNo || s.skuId, estMonthlyPriceVnd: 250000 };
            const total = Number(s.prepaidUnits?.enabled) || 0;
            const consumed = Number(s.consumedUnits) || 0;
            return {
              skuId: s.skuId,
              skuPartNumber: partNo || s.skuId,
              displayName: mapped.name,
              totalPrepaid: total,
              consumed: consumed,
              available: Math.max(0, total - consumed),
              unitPriceEstimate: mapped.estMonthlyPriceVnd,
              currency: 'VND',
            };
          });
        } else {
          console.warn('Microsoft Graph /subscribedSkus trả về status:', skuRes.status);
          syncWarning = 'Chưa cấp quyền Organization.Read.All trên Azure Portal để đọc tổng hạn ngạch mua dự phòng.';
        }
      } catch (e) {
        console.warn('Lỗi gọi /subscribedSkus:', e);
      }

      // 1b. Lấy danh sách các đợt mua (Subscriptions) qua /directory/subscriptions
      try {
        subscriptions = await fetchM365Subscriptions(token);
      } catch (e) {
        console.warn('Lỗi gọi /directory/subscriptions:', e);
      }

      // 2. Lấy danh sách người dùng nội bộ (Member) được gán bản quyền (Phân trang qua @odata.nextLink)
      let nextUrl: string | null =
        "https://graph.microsoft.com/v1.0/users?$filter=userType eq 'Member'&$select=id,displayName,userPrincipalName,mail,userType,accountEnabled,assignedLicenses,department,jobTitle&$top=999";
      const allRawUsers: any[] = [];
      let pageCount = 0;

      while (nextUrl && allRawUsers.length < 5000 && pageCount < 10) {
        pageCount++;
        const userRes: Response = await fetch(nextUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userRes.ok) {
          console.error('Lỗi khi lấy users từ Microsoft Graph:', userRes.status);
          break;
        }

        const userData: any = await userRes.json();
        const batch = Array.isArray(userData?.value) ? userData.value : [];
        allRawUsers.push(...batch);
        nextUrl = userData['@odata.nextLink'] || null;
      }

      const now = new Date().getTime();
      cloudUsers = allRawUsers
        .filter((u: any) => {
          const isMember = (u.userType || 'Member') === 'Member';
          const notGuest = !u.userPrincipalName?.includes('#EXT#') && !u.mail?.includes('#EXT#');
          return isMember && notGuest && Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0;
        })
        .map((u: any) => {
          const lastSignInStr = u.signInActivity?.lastSignInDateTime || null;
          let daysInactive: number | undefined = undefined;
          if (lastSignInStr) {
            const diffMs = now - new Date(lastSignInStr).getTime();
            daysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }

          const rawLicenses = u.assignedLicenses || [];
          const assignedSkuIds = rawLicenses.map((asg: any) => asg.skuId);

          const assignedNames = rawLicenses.map((asg: any) => {
            const foundSku = skus.find((s) => s.skuId === asg.skuId);
            if (foundSku) return foundSku.displayName;
            const mapped = M365_SKU_CATALOG[asg.skuId];
            return mapped ? mapped.name : asg.skuId;
          });

          // Chỉ coi là dormant nếu tài khoản bị khóa (disabled) hoặc không đăng nhập >= 45 ngày
          const isDormant = !u.accountEnabled || (daysInactive !== undefined && daysInactive >= 45);

          return {
            id: u.id,
            email: (u.userPrincipalName || u.mail || '').trim(),
            displayName: u.displayName || u.userPrincipalName || 'User',
            accountEnabled: Boolean(u.accountEnabled),
            assignedSkuNames: assignedNames,
            assignedSkuIds,
            lastSignInDate: lastSignInStr,
            daysInactive,
            isDormant,
            department: u.department || '',
            jobTitle: u.jobTitle || '',
            userPrincipalName: (u.userPrincipalName || '').trim(),
            mail: (u.mail || '').trim(),
            _rawLicenses: u.assignedLicenses,
          };
        });

      // 3. Nếu chưa lấy được Subscribed SKUs (do thiếu Organization.Read.All) nhưng có Subscriptions hoặc Users
      if (skus.length === 0) {
        // Đếm consumed từ cloudUsers
        const consumedBySku = new Map<string, number>();
        for (const cu of cloudUsers) {
          const rawLics = (cu as any)._rawLicenses || [];
          for (const lic of rawLics) {
            consumedBySku.set(lic.skuId, (consumedBySku.get(lic.skuId) || 0) + 1);
          }
        }

        const subsBySku = new Map<string, { total: number; partNumber: string; expiryDate?: string }>();
        subscriptions.forEach((sub) => {
          if (sub.status === 'Enabled' || !sub.status) {
            const existing = subsBySku.get(sub.skuId) || { total: 0, partNumber: sub.skuPartNumber || sub.skuId };
            existing.total += Number(sub.totalLicenses) || 0;
            if (sub.nextLifecycleDateTime) existing.expiryDate = sub.nextLifecycleDateTime;
            subsBySku.set(sub.skuId, existing);
          }
        });

        if (subsBySku.size > 0) {
          skus = Array.from(subsBySku.entries()).map(([skuId, item]) => {
            const mapped = M365_SKU_CATALOG[skuId] || M365_SKU_CATALOG[item.partNumber] || { name: item.partNumber || skuId, estMonthlyPriceVnd: 250000 };
            const consumed = consumedBySku.get(skuId) || 0;
            return {
              skuId,
              skuPartNumber: item.partNumber,
              displayName: mapped.name,
              totalPrepaid: item.total,
              consumed,
              available: Math.max(0, item.total - consumed),
              expiryDate: item.expiryDate,
              unitPriceEstimate: mapped.estMonthlyPriceVnd,
              currency: 'VND',
            };
          });

          // Thêm các SKU có user dùng nhưng không có trong commercial subscriptions
          for (const [skuId, count] of consumedBySku.entries()) {
            if (!subsBySku.has(skuId)) {
              const mapped = M365_SKU_CATALOG[skuId] || { name: skuId, estMonthlyPriceVnd: 0 };
              skus.push({
                skuId,
                skuPartNumber: skuId,
                displayName: mapped.name,
                totalPrepaid: count,
                consumed: count,
                available: 0,
                unitPriceEstimate: mapped.estMonthlyPriceVnd,
                currency: 'VND',
              });
            }
          }
        } else if (cloudUsers.length > 0) {
          // Fallback thuần từ user nếu subscriptions cũng không có
          const skuSummary = new Map<string, { count: number; name: string; price: number }>();
          for (const cu of cloudUsers) {
            const rawLics = (cu as any)._rawLicenses || [];
            for (const lic of rawLics) {
              const skuId = lic.skuId;
              const mapped = M365_SKU_CATALOG[skuId] || { name: skuId, estMonthlyPriceVnd: 250000 };
              const existing = skuSummary.get(skuId) || { count: 0, name: mapped.name, price: mapped.estMonthlyPriceVnd };
              existing.count += 1;
              skuSummary.set(skuId, existing);
            }
          }

          skus = Array.from(skuSummary.entries()).map(([skuId, item]) => ({
            skuId,
            skuPartNumber: skuId,
            displayName: item.name,
            totalPrepaid: item.count,
            consumed: item.count,
            available: 0,
            unitPriceEstimate: item.price,
            currency: 'VND',
          }));
        }

        // Chuẩn hóa lại tên hiển thị các license của từng user
        cloudUsers.forEach((cu) => {
          const rawLics = (cu as any)._rawLicenses || [];
          cu.assignedSkuNames = rawLics.map((lic: any) => {
            const found = skus.find((s) => s.skuId === lic.skuId);
            return found ? found.displayName : lic.skuId;
          });
        });
      }
    } catch (err: any) {
      console.warn('Lỗi kết nối Microsoft Graph API:', err);
      syncWarning = err?.message || 'Không thể liên lạc máy chủ Microsoft';
    }
  }

  // Dữ liệu mẫu Demo chân thực (CHỈ DÙNG KHI người dùng bật isDemoMode hoặc không có thông tin xác thực)
  if (isDemo || (cloudUsers.length === 0 && skus.length === 0 && !hasCredentials)) {
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
  const localLicenses: any[] = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { specs: { path: ['cloudProvider'], equals: 'm365' } },
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

  localLicenses.forEach((lic: any) => {
    totalLocalSeats += lic.totalSeats || 1;
    lic.assignments?.forEach((asg: any) => {
      totalLocalConsumed += 1;
      if (asg.user?.email) localAssignedEmails.add(asg.user.email.toLowerCase().trim());
    });
    if (Array.isArray(lic.batches)) {
      lic.batches.forEach((b: any) => {
        totalLocalSeats += b.totalSeats || 0;
        b.assignments?.forEach((asg: any) => {
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
      : syncWarning
      ? `Đã đồng bộ trực tiếp ${cloudUsers.length} tài khoản nhân sự và ${skus.length} gói bản quyền từ Microsoft 365. (${syncWarning})`
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
    cloudUsers,
    estimatedPotentialSavings,
    currency: 'VND',
    subscriptions,
  };
}
