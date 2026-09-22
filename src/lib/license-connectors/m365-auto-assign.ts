import { prisma } from '@/lib/db';
import { syncAndReconcileM365 } from './m365-connector';
import { areCompaniesEqual } from '@/lib/normalize';

export interface AutoAssignOptions {
  userId?: string;
  dryRun?: boolean;
  autoReclaim?: boolean;
}

export interface CandidateBatch {
  id: string;
  name: string;
  skuId?: string;
  companyName: string;
  expiryDate: Date | null;
  totalSeats: number;
  usedCount: number;
  assignedUserEmails: Set<string>;
}

export async function executeAutoAssignM365(options: AutoAssignOptions = {}) {
  const dryRun = Boolean(options.dryRun);
  const autoReclaim = options.autoReclaim !== false;

  // 1. Lấy cấu hình M365 từ DB
  const settings = await prisma.systemSetting.findMany({
    where: {
      key: {
        in: [
          'license.m365_tenant_id',
          'license.m365_client_id',
          'license.m365_client_secret',
          'license.m365_is_demo',
          'sso.ms365_tenant_id',
          'sso.ms365_client_id',
          'sso.ms365_client_secret',
        ],
      },
    },
  });
  const map = new Map<string, string>();
  settings.forEach((s) => map.set(s.key, s.value));

  const tenantId = map.get('license.m365_tenant_id') || map.get('sso.ms365_tenant_id') || '';
  const clientId = map.get('license.m365_client_id') || map.get('sso.ms365_client_id') || '';
  const clientSecret = map.get('license.m365_client_secret') || map.get('sso.ms365_client_secret') || '';
  const isDemoMode = map.get('license.m365_is_demo') === 'true' || !tenantId || !clientId;

  // 2. Chạy lấy dữ liệu Cloud
  const report = await syncAndReconcileM365({
    tenantId,
    clientId,
    clientSecret,
    isDemoMode,
  });

  // 3. Lấy danh sách công ty từ Cài đặt
  const companySetting = await prisma.systemSetting.findUnique({
    where: { key: 'corporate.companies' },
  });
  let officialCompanies: string[] = [
    'Công ty Cổ phần Tập đoàn ABC',
    'Công ty TNHH MTV Công Nghệ ABC',
    'Chi nhánh Miền Bắc (Hà Nội)',
    'Chi nhánh Miền Nam (TP.HCM)',
  ];
  if (companySetting?.value) {
    try {
      const parsed = JSON.parse(companySetting.value);
      if (Array.isArray(parsed) && parsed.length > 0) officialCompanies = parsed;
    } catch {}
  }

  // 4. Lấy danh sách Users hiện tại trong DB và Role mặc định
  const defaultRole = await prisma.role.findFirst({ select: { id: true } });
  let adminId = options.userId;
  if (!adminId) {
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: 'admin@company.com' },
          { role: { name: { contains: 'Admin', mode: 'insensitive' } } },
        ],
      },
      select: { id: true },
    });
    adminId = adminUser?.id || (await prisma.user.findFirst({ select: { id: true } }))?.id;
  }

  const dbUsers = await prisma.user.findMany({
    select: { id: true, email: true, fullName: true, companyName: true, department: true },
  });
  const dbUserByEmail = new Map<string, any>();
  dbUsers.forEach((u) => {
    if (u.email) dbUserByEmail.set(u.email.toLowerCase().trim(), u);
  });

  // 5. Lấy danh sách Master Licenses của Microsoft 365 (và các child batches)
  let candidateLicenses: any[] = await prisma.license.findMany({
    where: {
      status: 'ACTIVE',
      parentLicenseId: null, // Chỉ lấy master licenses ở cấp cao nhất
      OR: [
        { specs: { path: ['cloudProvider'], equals: 'm365' } },
        { name: { contains: '365', mode: 'insensitive' } },
        { name: { contains: 'Microsoft', mode: 'insensitive' } },
        { name: { contains: 'Office', mode: 'insensitive' } },
        { name: { contains: 'Power BI', mode: 'insensitive' } },
        { name: { contains: 'Visio', mode: 'insensitive' } },
        { name: { contains: 'Project', mode: 'insensitive' } },
        { name: { contains: 'Exchange', mode: 'insensitive' } },
      ],
    },
    include: {
      assignments: { where: { revokedAt: null } },
      batches: {
        include: {
          assignments: { where: { revokedAt: null } },
        },
      },
    },
  });

  // Nếu chưa có License nào trong hệ thống, tự động khởi tạo từ các gói SKU trên Cloud
  if (candidateLicenses.length === 0 && report.skus.length > 0) {
    let vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { name: { contains: 'Microsoft', mode: 'insensitive' } },
          { name: { contains: 'FPT Smart Cloud', mode: 'insensitive' } },
        ],
      },
    });
    if (!vendor) {
      vendor = await prisma.vendor.create({
        data: {
          name: 'Microsoft Corporation',
          contactPerson: 'Microsoft Enterprise Support',
          email: 'support@microsoft.com',
          notes: 'Tự động khởi tạo khi phân bổ bản quyền Cloud',
        },
      });
    }
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    for (const sku of report.skus) {
      const displayName = (sku.displayName || sku.skuPartNumber || 'Microsoft 365 License').trim();
      const partNumber = (sku.skuPartNumber || sku.skuId || '').trim();
      const totalPrepaid = Number(sku.totalPrepaid) || 1;
      const unitPrice = Number(sku.unitPriceEstimate) || 0;
      const totalPrice = unitPrice * totalPrepaid;

      await prisma.license.create({
        data: {
          name: displayName,
          licenseKey: partNumber,
          licenseType: 'SUBSCRIPTION',
          totalSeats: totalPrepaid,
          usedSeats: 0,
          purchaseDate: now,
          expiryDate: oneYearLater,
          purchasePrice: totalPrice > 0 ? totalPrice : null,
          purchaseCurrency: 'VND',
          vendorId: vendor.id,
          companyName: officialCompanies[0],
          status: 'ACTIVE',
          specs: {
            skuId: sku.skuId,
            skuPartNumber: partNumber,
            cloudProvider: 'm365',
            autoProvisioned: true,
          },
          notes: `Tự động khởi tạo từ cổng Cloud đối soát (${partNumber})`,
        },
      });
    }

    candidateLicenses = await prisma.license.findMany({
      where: {
        status: 'ACTIVE',
        parentLicenseId: null,
        OR: [
          { specs: { path: ['cloudProvider'], equals: 'm365' } },
          { name: { contains: '365', mode: 'insensitive' } },
          { name: { contains: 'Microsoft', mode: 'insensitive' } },
          { name: { contains: 'Office', mode: 'insensitive' } },
          { name: { contains: 'Power BI', mode: 'insensitive' } },
          { name: { contains: 'Visio', mode: 'insensitive' } },
          { name: { contains: 'Project', mode: 'insensitive' } },
          { name: { contains: 'Exchange', mode: 'insensitive' } },
        ],
      },
      include: {
        assignments: { where: { revokedAt: null } },
        batches: {
          include: {
            assignments: { where: { revokedAt: null } },
          },
        },
      },
    });
  }

  if (candidateLicenses.length === 0) {
    return {
      success: false,
      error: 'Không tìm thấy gói bản quyền Microsoft 365 nào trong hệ thống để phân bổ.',
    };
  }

  // Phẳng hóa tất cả các đợt mua khả dụng (gồm cả master license và các child batches)
  const allBatches: CandidateBatch[] = [];
  const allAssignedEmails = new Set<string>();

  candidateLicenses.forEach((lic: any) => {
    const licSkuId = (lic.specs as any)?.skuId || lic.licenseKey;
    const parentEmails = new Set<string>();
    lic.assignments?.forEach((asg: any) => {
      const u = dbUsers.find((x) => x.id === asg.userId);
      if (u?.email) {
        parentEmails.add(u.email.toLowerCase().trim());
        allAssignedEmails.add(u.email.toLowerCase().trim());
      }
    });

    // 1. Luôn thêm chính license cha nếu có số ghế > 0 (Đợt 1 / Pool chính)
    if ((lic.totalSeats || 0) > 0) {
      allBatches.push({
        id: lic.id,
        name: (lic.specs as any)?.batchName || (lic.batches && lic.batches.length > 0 ? `${lic.name} (Đợt 1)` : lic.name),
        skuId: licSkuId,
        companyName: lic.companyName || officialCompanies[0],
        expiryDate: lic.expiryDate,
        totalSeats: lic.totalSeats || 1,
        usedCount: lic.assignments?.length || 0,
        assignedUserEmails: parentEmails,
      });
    }

    // 2. Thêm các đợt con
    if (Array.isArray(lic.batches)) {
      lic.batches.forEach((b: any, idx: number) => {
        const bEmails = new Set<string>();
        b.assignments?.forEach((asg: any) => {
          const u = dbUsers.find((x) => x.id === asg.userId);
          if (u?.email) {
            bEmails.add(u.email.toLowerCase().trim());
            allAssignedEmails.add(u.email.toLowerCase().trim());
          }
        });

        allBatches.push({
          id: b.id,
          name: b.name || `${lic.name} (Đợt ${idx + 2})`,
          skuId: (b.specs as any)?.skuId || licSkuId,
          companyName: b.companyName || lic.companyName || officialCompanies[0],
          expiryDate: b.expiryDate || lic.expiryDate,
          totalSeats: b.totalSeats || 1,
          usedCount: b.assignments?.length || 0,
          assignedUserEmails: bEmails,
        });
      });
    }
  });

  const results: Array<{
    email: string;
    displayName: string;
    userCompany: string;
    buyerCompany: string;
    batchName: string;
    isCross: boolean;
    action: 'ASSIGNED' | 'RECLAIMED' | 'SKIPPED_ACTIVE';
    notes?: string;
  }> = [];

  const affectedLicenseIds = new Set<string>();

  // 6. XỬ LÝ THU HỒI (RECLAIM) TÀI KHOẢN ĐÃ BỊ KHÓA / NGHỈ VIỆC TRÊN M365
  let reclaimedCount = 0;
  if (autoReclaim && report.dormantUsers) {
    for (const dormant of report.dormantUsers) {
      if (!dormant.accountEnabled && dormant.email) {
        const emailClean = dormant.email.toLowerCase().trim();
        const targetDbUser = dbUserByEmail.get(emailClean);

        if (targetDbUser) {
          const activeAsgs = await prisma.licenseAssignment.findMany({
            where: {
              userId: targetDbUser.id,
              revokedAt: null,
              licenseId: { in: allBatches.map((b) => b.id) },
            },
          });

          for (const asg of activeAsgs) {
            if (!dryRun) {
              await prisma.licenseAssignment.update({
                where: { id: asg.id },
                data: {
                  revokedAt: new Date(),
                  notes: `[Tự Động Thu Hồi M365] Nhân sự đã nghỉ việc / tài khoản bị vô hiệu hóa trên Cloud (${new Date().toLocaleDateString('vi-VN')})`,
                },
              });
            }
            affectedLicenseIds.add(asg.licenseId);
            reclaimedCount++;

            const foundBatch = allBatches.find((b) => b.id === asg.licenseId);
            if (foundBatch) {
              foundBatch.usedCount = Math.max(0, foundBatch.usedCount - 1);
              foundBatch.assignedUserEmails.delete(emailClean);
            }
            allAssignedEmails.delete(emailClean);

            results.push({
              email: dormant.email,
              displayName: dormant.displayName,
              userCompany: targetDbUser.companyName || 'Không rõ',
              buyerCompany: foundBatch?.companyName || '—',
              batchName: foundBatch?.name || 'Gói bản quyền',
              isCross: false,
              action: 'RECLAIMED',
              notes: 'Đã giải phóng ghế do tài khoản bị vô hiệu hóa trên Cloud',
            });
          }
        }
      }
    }
  }

  // 7. XỬ LÝ GÁN ĐỢT THEO CÔNG TY & FIFO CHO CÁC TÀI KHOẢN CLOUD CÓ LICENSE
  let selfAssignedCount = 0;
  let crossAssignedCount = 0;
  let skippedCount = 0;

  const rawCloudUsers = report.cloudUsers && report.cloudUsers.length > 0
    ? report.cloudUsers
    : [...report.unmatchedUsers, ...report.dormantUsers];
  const usersToAssign = rawCloudUsers.filter((u) => u.accountEnabled !== false);

  const sortFifo = (a: CandidateBatch, b: CandidateBatch) => {
    if (!a.expiryDate && !b.expiryDate) return 0;
    if (!a.expiryDate) return 1;
    if (!b.expiryDate) return -1;
    return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
  };

  for (const u of usersToAssign) {
    if (!u.email) continue;
    const emailClean = u.email.toLowerCase().trim();
    const upnClean = (u.userPrincipalName || '').toLowerCase().trim();
    const mailClean = (u.mail || '').toLowerCase().trim();

    // Xác định Công ty của User
    let userCompany = '';
    let targetDbUser = dbUserByEmail.get(emailClean) ||
                       (upnClean ? dbUserByEmail.get(upnClean) : null) ||
                       (mailClean ? dbUserByEmail.get(mailClean) : null);

    if (targetDbUser && targetDbUser.companyName) {
      userCompany = targetDbUser.companyName.trim();
    } else {
      const deptStr = (u.department || '').toLowerCase();
      const matchedOfficial = officialCompanies.find((c) => {
        const cLower = c.toLowerCase();
        return deptStr.includes(cLower) || cLower.includes(deptStr);
      });
      userCompany = matchedOfficial || officialCompanies[0];

      if (!targetDbUser && !dryRun) {
        targetDbUser = await prisma.user.create({
          data: {
            email: emailClean,
            fullName: u.displayName || emailClean.split('@')[0],
            companyName: userCompany,
            department: u.department || null,
            position: u.jobTitle || null,
            passwordHash: '$2b$10$dummyhashforcloudsyncedaccount1234567890',
            roleId: defaultRole!.id,
          },
        });
        dbUserByEmail.set(emailClean, targetDbUser);
      }
    }

    const userRawLics = (u as any)._rawLicenses || [];
    const userSkuItems: Array<{ skuId?: string; name: string }> = [];

    if (Array.isArray(u.assignedSkuIds) && u.assignedSkuIds.length > 0) {
      u.assignedSkuIds.forEach((sid: string, idx: number) => {
        userSkuItems.push({ skuId: sid, name: u.assignedSkuNames?.[idx] || sid });
      });
    } else if (Array.isArray(userRawLics) && userRawLics.length > 0) {
      userRawLics.forEach((rl: any, idx: number) => {
        userSkuItems.push({ skuId: rl.skuId, name: u.assignedSkuNames?.[idx] || rl.skuId });
      });
    } else if (Array.isArray(u.assignedSkuNames) && u.assignedSkuNames.length > 0) {
      u.assignedSkuNames.forEach((name: string) => {
        userSkuItems.push({ name });
      });
    }

    for (const skuItem of userSkuItems) {
      const eligibleBatches = allBatches.filter((b) => {
        if (skuItem.skuId && b.skuId) {
          return b.skuId === skuItem.skuId;
        }
        if (skuItem.name && b.name) {
          return b.name.toLowerCase() === skuItem.name.toLowerCase();
        }
        return false;
      });

      if (eligibleBatches.length === 0) continue;
      const targetBatches = eligibleBatches;

      // Nếu user đã được gán vào batch thuộc gói này rồi thì bỏ qua
      const alreadyInBatch = targetBatches.some((b) => b.assignedUserEmails.has(emailClean));
      if (alreadyInBatch) {
        skippedCount++;
        continue;
      }

      const sameCompanyBatches = targetBatches
        .filter((b) => areCompaniesEqual(b.companyName, userCompany))
        .sort(sortFifo);

      let chosenBatch = sameCompanyBatches.find((b) => b.usedCount < b.totalSeats);
      let isCross = false;

      // Nếu công ty đó hết chỗ hoặc chưa có đợt mua, tìm đợt của công ty khác còn chỗ
      if (!chosenBatch) {
        const otherBatches = targetBatches
          .filter((b) => b.usedCount < b.totalSeats)
          .sort(sortFifo);

        if (otherBatches.length > 0) {
          chosenBatch = otherBatches[0];
          isCross = true;
        } else {
          // Nếu tất cả đợt đều đã kín, gán vào đợt có hạn xa nhất (over-allocated)
          chosenBatch = targetBatches[targetBatches.length - 1];
          isCross = !areCompaniesEqual(chosenBatch.companyName, userCompany);
        }
      }

      if (chosenBatch) {
        if (!dryRun && targetDbUser) {
          await prisma.licenseAssignment.create({
            data: {
              licenseId: chosenBatch.id,
              userId: targetDbUser.id,
              assignedById: (options.userId || adminId)!,
              notes: isCross
                ? `[Tự Động FIFO M365] Cấp phát mượn chéo: Nhân sự thuộc "${userCompany}" mượn quota của "${chosenBatch.companyName}"`
                : `[Tự Động FIFO M365] Cấp phát nội bộ khớp công ty: "${userCompany}"`,
            },
          });
        }

        chosenBatch.usedCount += 1;
        chosenBatch.assignedUserEmails.add(emailClean);
        allAssignedEmails.add(emailClean);
        affectedLicenseIds.add(chosenBatch.id);

        if (isCross) {
          crossAssignedCount++;
        } else {
          selfAssignedCount++;
        }

        results.push({
          email: u.email,
          displayName: u.displayName || u.email,
          userCompany,
          buyerCompany: chosenBatch.companyName,
          batchName: chosenBatch.name,
          isCross,
          action: 'ASSIGNED',
          notes: isCross ? `Mượn quota từ ${chosenBatch.companyName}` : 'Khớp công ty nội bộ',
        });
      }
    }
  }

  // 8. Cập nhật lại `usedSeats` trong bảng License cho các bản ghi bị thay đổi
  if (!dryRun) {
    for (const affId of affectedLicenseIds) {
      const cnt = await prisma.licenseAssignment.count({
        where: { licenseId: affId, revokedAt: null },
      });
      await prisma.license.update({
        where: { id: affId },
        data: { usedSeats: cnt },
      });
    }
  }

  return {
    success: true,
    dryRun,
    message: dryRun
      ? `Đã mô phỏng phân bổ: ${selfAssignedCount} đúng công ty, ${crossAssignedCount} mượn chéo, ${reclaimedCount} thu hồi.`
      : `Phân bổ thành công! ${selfAssignedCount} ghế đúng công ty, ${crossAssignedCount} ghế mượn chéo, ${reclaimedCount} ghế đã giải phóng.`,
    stats: {
      selfAssignedCount,
      crossAssignedCount,
      reclaimedCount,
      skippedCount,
      totalProcessed: results.length,
    },
    results,
  };
}
