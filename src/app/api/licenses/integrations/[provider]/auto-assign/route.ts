import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncAndReconcileM365 } from '@/lib/license-connectors/m365-connector';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider } = await params;
    if (provider !== 'm365') {
      return NextResponse.json({ error: `Tự động phân bổ cho "${provider}" chưa được hỗ trợ.` }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = Boolean(body.dryRun);
    const autoReclaim = body.autoReclaim !== false; // Mặc định bật thu hồi tài khoản disabled

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

    // 4. Lấy danh sách Users hiện tại trong DB
    const dbUsers = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, companyName: true, department: true },
    });
    const dbUserByEmail = new Map<string, any>();
    dbUsers.forEach((u) => {
      if (u.email) dbUserByEmail.set(u.email.toLowerCase().trim(), u);
    });

    // 5. Lấy danh sách các License & Batches của Microsoft 365
    const candidateLicenses = await prisma.license.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: '365', mode: 'insensitive' } },
          { name: { contains: 'Microsoft', mode: 'insensitive' } },
          { name: { contains: 'Office', mode: 'insensitive' } },
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

    if (candidateLicenses.length === 0) {
      return NextResponse.json(
        { error: 'Không tìm thấy gói bản quyền Microsoft 365 nào trong hệ thống để phân bổ.' },
        { status: 400 }
      );
    }

    // Phẳng hóa tất cả các đợt mua khả dụng
    interface CandidateBatch {
      id: string;
      name: string;
      companyName: string;
      expiryDate: Date | null;
      totalSeats: number;
      usedCount: number;
      assignedUserEmails: Set<string>;
    }

    const allBatches: CandidateBatch[] = [];
    const allAssignedEmails = new Set<string>();

    candidateLicenses.forEach((lic) => {
      const parentEmails = new Set<string>();
      lic.assignments.forEach((asg) => {
        const u = dbUsers.find((x) => x.id === asg.userId);
        if (u?.email) {
          parentEmails.add(u.email.toLowerCase().trim());
          allAssignedEmails.add(u.email.toLowerCase().trim());
        }
      });

      // Thêm chính license cha nếu không có đợt con hoặc có seat riêng
      if (!lic.batches || lic.batches.length === 0) {
        allBatches.push({
          id: lic.id,
          name: lic.name,
          companyName: lic.companyName || officialCompanies[0],
          expiryDate: lic.expiryDate,
          totalSeats: lic.totalSeats || 1,
          usedCount: lic.assignments.length,
          assignedUserEmails: parentEmails,
        });
      }

      // Thêm các đợt con
      if (Array.isArray(lic.batches)) {
        lic.batches.forEach((b, idx) => {
          const bEmails = new Set<string>();
          b.assignments?.forEach((asg) => {
            const u = dbUsers.find((x) => x.id === asg.userId);
            if (u?.email) {
              bEmails.add(u.email.toLowerCase().trim());
              allAssignedEmails.add(u.email.toLowerCase().trim());
            }
          });

          allBatches.push({
            id: b.id,
            name: `${lic.name} (Đợt ${idx + 1})`,
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
    if (autoReclaim) {
      for (const dormant of report.dormantUsers) {
        if (!dormant.accountEnabled && dormant.email) {
          const emailClean = dormant.email.toLowerCase().trim();
          const targetDbUser = dbUserByEmail.get(emailClean);

          if (targetDbUser) {
            // Tìm các assignment đang active của user này trong các gói M365
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

              // Cập nhật memory count
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

    // 7. XỬ LÝ GÁN ĐỢT THEO CÔNG TY & FIFO CHO CÁC TÀI KHOẢN MỚI
    let selfAssignedCount = 0;
    let crossAssignedCount = 0;
    let skippedCount = 0;

    // Lấy danh sách users active từ Cloud (loại bỏ những tài khoản đã bị khóa nếu không muốn gán)
    const activeCloudUsers = report.skus.length > 0 ? (report.dormantUsers ? report.dormantUsers.filter(u => u.accountEnabled) : []) : [];
    // Gộp cả unmatchedUsers
    const usersToAssign = [...report.unmatchedUsers];

    for (const u of usersToAssign) {
      if (!u.email) continue;
      const emailClean = u.email.toLowerCase().trim();

      // Nếu đã được gán rồi thì bỏ qua
      if (allAssignedEmails.has(emailClean)) {
        skippedCount++;
        continue;
      }

      // A. Xác định Công ty của User
      let userCompany = '';
      let targetDbUser = dbUserByEmail.get(emailClean);

      if (targetDbUser && targetDbUser.companyName) {
        userCompany = targetDbUser.companyName.trim();
      } else {
        // So khớp qua department hoặc chuỗi công ty trong cài đặt
        const deptStr = (u.department || '').toLowerCase();
        const matchedOfficial = officialCompanies.find((c) => {
          const cLower = c.toLowerCase();
          return deptStr.includes(cLower) || cLower.includes(deptStr);
        });
        userCompany = matchedOfficial || officialCompanies[0];

        // Nếu chưa có DB User và không phải dryRun, tạo user mới
        if (!targetDbUser && !dryRun) {
          targetDbUser = await prisma.user.create({
            data: {
              email: emailClean,
              name: u.displayName || emailClean.split('@')[0],
              fullName: u.displayName || emailClean.split('@')[0],
              companyName: userCompany,
              department: u.department || null,
              jobTitle: u.jobTitle || null,
              passwordHash: '$2b$10$dummyhashforcloudsyncedaccount1234567890',
            },
          });
          dbUserByEmail.set(emailClean, targetDbUser);
        }
      }

      // B. Thuật toán FIFO: Tìm đợt của công ty đó còn trống ghế
      // Sắp xếp theo expiryDate ASC (hạn gần nhất lên đầu, null xếp sau)
      const sortFifo = (a: CandidateBatch, b: CandidateBatch) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      };

      const sameCompanyBatches = allBatches
        .filter((b) => b.companyName.trim().toLowerCase() === userCompany.toLowerCase())
        .sort(sortFifo);

      let chosenBatch = sameCompanyBatches.find((b) => b.usedCount < b.totalSeats);
      let isCross = false;

      // Nếu công ty đó hết chỗ hoặc chưa có đợt mua, tìm đợt của công ty khác còn chỗ
      if (!chosenBatch) {
        const otherBatches = allBatches
          .filter((b) => b.usedCount < b.totalSeats)
          .sort(sortFifo);

        if (otherBatches.length > 0) {
          chosenBatch = otherBatches[0];
          isCross = true;
        } else {
          // Nếu tất cả đợt đều đã kín, gán vào đợt có hạn xa nhất (over-allocated)
          chosenBatch = allBatches[allBatches.length - 1];
          isCross = chosenBatch.companyName.trim().toLowerCase() !== userCompany.toLowerCase();
        }
      }

      if (chosenBatch) {
        // Thực thi gán vào DB nếu không phải dryRun
        if (!dryRun && targetDbUser) {
          await prisma.licenseAssignment.create({
            data: {
              licenseId: chosenBatch.id,
              userId: targetDbUser.id,
              assignedById: currentUser.userId,
              notes: isCross
                ? `[Tự Động FIFO M365] Cấp phát mượn chéo: Nhân sự thuộc "${userCompany}" mượn quota của "${chosenBatch.companyName}"`
                : `[Tự Động FIFO M365] Cấp phát nội bộ khớp công ty: "${userCompany}"`,
            },
          });
        }

        // Cập nhật trạng thái bộ nhớ
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
          notes: isCross ? 'Mượn hạn mức chéo (Đã chuyển sang Ma trận bù trừ)' : 'Khớp đúng đợt công ty',
        });
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

    return NextResponse.json({
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
    });
  } catch (err: any) {
    console.error('Lỗi khi tự động phân bổ M365:', err);
    return NextResponse.json({ error: err?.message || 'Lỗi xử lý tự động phân bổ' }, { status: 500 });
  }
}
