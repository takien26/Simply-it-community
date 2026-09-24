import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { syncAndReconcileM365 } from '@/lib/license-connectors/m365-connector';
import { executeAutoAssignM365 } from '@/lib/license-connectors/m365-auto-assign';
import { normalizeCompanyName } from '@/lib/normalize';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'licenses.create'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền tạo hoặc nhập bản quyền' }, { status: 403 });
    }

    const { provider } = await params;
    const body = await req.json().catch(() => ({}));

    // 1. Lấy danh sách SKUs và Subscriptions từ Cloud
    let skus = Array.isArray(body.skus) && body.skus.length > 0 ? body.skus : null;
    let subscriptions: any[] = [];

    if (provider === 'm365') {
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

      const report = await syncAndReconcileM365({
        tenantId,
        clientId,
        clientSecret,
        isDemoMode,
      });
      if (!skus) {
        skus = report.skus;
      }
      subscriptions = report.subscriptions || [];
    } else if (!skus) {
      return NextResponse.json({ error: `Nhà cung cấp "${provider}" chưa được hỗ trợ nhập tự động.` }, { status: 400 });
    }

    if (!skus || skus.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy gói SKU nào từ Cloud để nhập.' }, { status: 400 });
    }

    // 2. Tìm hoặc tạo Vendor tương ứng
    let vendorName = 'Microsoft Corporation';
    if (provider === 'google') vendorName = 'Google LLC';
    if (provider === 'adobe') vendorName = 'Adobe Systems';

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
          name: vendorName,
          contactPerson: 'Microsoft Partner / Enterprise Support',
          email: 'support@microsoft.com',
          website: 'https://admin.microsoft.com',
          notes: 'Nhà cung cấp bản quyền đám mây được hệ thống tự động khởi tạo',
        },
      });
    }

    // 3. Lấy công ty mặc định
    const companySetting = await prisma.systemSetting.findUnique({
      where: { key: 'corporate.companies' },
    });
    let defaultCompany = 'Tập đoàn / Công ty chính';
    if (companySetting?.value) {
      try {
        const parsed = JSON.parse(companySetting.value);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          defaultCompany = normalizeCompanyName(parsed[0]);
        }
      } catch {}
    } else {
      defaultCompany = normalizeCompanyName('GELEX');
    }

    // 4. Nhập / Cập nhật từng SKU và các đợt mua (Batches) vào bảng License
    let createdCount = 0;
    let updatedCount = 0;
    let batchCount = 0;
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    for (const sku of skus) {
      const displayName = (sku.displayName || sku.skuPartNumber || 'Cloud License').trim();
      const partNumber = (sku.skuPartNumber || sku.skuId || '').trim();
      const totalPrepaid = Number(sku.totalPrepaid) || 1;
      const unitPrice = Number(sku.unitPriceEstimate) || 0;

      // Tìm các đợt mua subscription tương ứng với SKU này
      const matchingSubs = subscriptions
        .filter(
          (s) =>
            (s.skuId === sku.skuId || s.skuPartNumber === sku.skuPartNumber || s.skuPartNumber === partNumber) &&
            (s.status === 'Enabled' || !s.status)
        )
        .sort((a, b) => new Date(a.createdDateTime).getTime() - new Date(b.createdDateTime).getTime());

      // Tìm master license đã có
      let existing = await prisma.license.findFirst({
        where: {
          parentLicenseId: null,
          OR: [
            { specs: { path: ['skuId'], equals: sku.skuId } },
            { licenseKey: { equals: partNumber, mode: 'insensitive' } },
            { name: { equals: displayName, mode: 'insensitive' } },
          ],
        },
        include: {
          batches: true,
        },
      });

      if (matchingSubs.length > 1) {
        // ========== NHIỀU ĐỢT MUA (BATCHES) ==========
        const sub0 = matchingSubs[0];
        const sub0Seats = Number(sub0.totalLicenses) || 1;
        const sub0PDate = sub0.createdDateTime ? new Date(sub0.createdDateTime) : now;
        const sub0EDate = sub0.nextLifecycleDateTime ? new Date(sub0.nextLifecycleDateTime) : oneYearLater;

        if (!existing) {
          existing = await prisma.license.create({
            data: {
              name: displayName,
              licenseKey: partNumber,
              licenseType: 'SUBSCRIPTION',
              totalSeats: sub0Seats,
              usedSeats: 0,
              purchaseDate: sub0PDate,
              expiryDate: sub0EDate,
              purchasePrice: unitPrice * sub0Seats > 0 ? unitPrice * sub0Seats : null,
              purchaseCurrency: 'VND',
              vendorId: vendor.id,
              companyName: defaultCompany,
              status: 'ACTIVE',
              specs: {
                skuId: sku.skuId,
                skuPartNumber: partNumber,
                commerceSubscriptionId: sub0.commerceSubscriptionId,
                subscriptionId: sub0.id,
                batchName: `Đợt 1 (Mua ban đầu - ${sub0Seats} seats)`,
                cloudProvider: provider,
                unitPriceMonthly: unitPrice,
                autoImportedAt: now.toISOString(),
              },
              notes: `Gói bản quyền mẹ (Đợt 1) tự động nhập từ ${provider.toUpperCase()} (${partNumber})`,
            },
            include: { batches: true },
          });
          createdCount++;
        } else {
          // Cập nhật master license với thông tin đợt 1
          await prisma.license.update({
            where: { id: existing.id },
            data: {
              totalSeats: sub0Seats,
              purchaseDate: sub0PDate,
              expiryDate: sub0EDate,
              specs: {
                ...((existing.specs as object) || {}),
                skuId: sku.skuId,
                skuPartNumber: partNumber,
                commerceSubscriptionId: sub0.commerceSubscriptionId,
                subscriptionId: sub0.id,
                batchName: (existing.specs as any)?.batchName || `Đợt 1 (Mua ban đầu - ${sub0Seats} seats)`,
                cloudProvider: provider,
                unitPriceMonthly: unitPrice,
              },
            },
          });
          updatedCount++;
        }

        // Tạo / Cập nhật các đợt mua con (Child Batches)
        for (let i = 1; i < matchingSubs.length; i++) {
          const sub = matchingSubs[i];
          const subSeats = Number(sub.totalLicenses) || 1;
          const subPDate = sub.createdDateTime ? new Date(sub.createdDateTime) : now;
          const subEDate = sub.nextLifecycleDateTime ? new Date(sub.nextLifecycleDateTime) : null;
          const batchPrice = unitPrice * subSeats;

          const existingBatch = existing.batches?.find(
            (b) =>
              b.licenseKey === sub.commerceSubscriptionId ||
              (b.specs as any)?.commerceSubscriptionId === sub.commerceSubscriptionId ||
              (b.specs as any)?.subscriptionId === sub.id
          );

          if (existingBatch) {
            await prisma.license.update({
              where: { id: existingBatch.id },
              data: {
                totalSeats: subSeats,
                purchaseDate: subPDate,
                expiryDate: subEDate,
                specs: {
                  ...((existingBatch.specs as object) || {}),
                  skuId: sku.skuId,
                  skuPartNumber: partNumber,
                  commerceSubscriptionId: sub.commerceSubscriptionId,
                  subscriptionId: sub.id,
                  batchName: `Đợt ${i + 1} (Bổ sung ${subSeats} seats)`,
                },
              },
            });
            updatedCount++;
          } else {
            await prisma.license.create({
              data: {
                name: `${displayName} (Đợt ${i + 1})`,
                licenseKey: sub.commerceSubscriptionId,
                licenseType: 'SUBSCRIPTION',
                totalSeats: subSeats,
                usedSeats: 0,
                purchaseDate: subPDate,
                expiryDate: subEDate,
                purchasePrice: batchPrice > 0 ? batchPrice : null,
                purchaseCurrency: 'VND',
                vendorId: vendor.id,
                companyName: normalizeCompanyName(existing.companyName || defaultCompany),
                status: 'ACTIVE',
                parentLicenseId: existing.id,
                specs: {
                  skuId: sku.skuId,
                  skuPartNumber: partNumber,
                  commerceSubscriptionId: sub.commerceSubscriptionId,
                  subscriptionId: sub.id,
                  batchName: `Đợt ${i + 1} (Bổ sung ${subSeats} seats)`,
                  cloudProvider: provider,
                  unitPriceMonthly: unitPrice,
                  autoImportedAt: now.toISOString(),
                },
                notes: `Đợt mua bổ sung ${i + 1} được tự động đọc từ Microsoft 365 Subscription ID ${sub.commerceSubscriptionId}`,
              },
            });
            createdCount++;
            batchCount++;
          }
        }
      } else {
        // ========== 1 ĐỢT MUA DUY NHẤT HOẶC SKU CHUẨN ==========
        const sub = matchingSubs[0];
        const actualSeats = sub ? Number(sub.totalLicenses) || totalPrepaid : totalPrepaid;
        const pDate = sub?.createdDateTime ? new Date(sub.createdDateTime) : now;
        const eDate = sub?.nextLifecycleDateTime ? new Date(sub.nextLifecycleDateTime) : oneYearLater;
        const totalPrice = unitPrice * actualSeats;

        if (!existing) {
          await prisma.license.create({
            data: {
              name: displayName,
              licenseKey: partNumber,
              licenseType: 'SUBSCRIPTION',
              totalSeats: actualSeats,
              usedSeats: 0,
              purchaseDate: pDate,
              expiryDate: eDate,
              purchasePrice: totalPrice > 0 ? totalPrice : null,
              purchaseCurrency: 'VND',
              vendorId: vendor.id,
              companyName: defaultCompany,
              status: 'ACTIVE',
              specs: {
                skuId: sku.skuId,
                skuPartNumber: partNumber,
                commerceSubscriptionId: sub?.commerceSubscriptionId,
                subscriptionId: sub?.id,
                cloudProvider: provider,
                unitPriceMonthly: unitPrice,
                autoImportedAt: now.toISOString(),
              },
              notes: `Bản quyền thuê bao Cloud được tự động nhập từ ${provider.toUpperCase()} (${partNumber})`,
            },
          });
          createdCount++;
        } else {
          if (existing.totalSeats !== actualSeats || !existing.expiryDate) {
            await prisma.license.update({
              where: { id: existing.id },
              data: {
                totalSeats: actualSeats,
                purchaseDate: pDate,
                expiryDate: eDate,
                vendorId: existing.vendorId || vendor.id,
                companyName: existing.companyName || defaultCompany,
                specs: {
                  ...((existing.specs as object) || {}),
                  skuId: sku.skuId,
                  skuPartNumber: partNumber,
                  commerceSubscriptionId: sub?.commerceSubscriptionId,
                  subscriptionId: sub?.id,
                },
              },
            });
            updatedCount++;
          }
        }
      }
    }

    // 5. Tự động đồng bộ và phân bổ nhân sự vào các gói bản quyền vừa nhập (Seamless Auto-Assign)
    let autoAssignStats = null;
    if (provider === 'm365') {
      try {
        const assignRes = await executeAutoAssignM365({
          userId: currentUser.userId,
          dryRun: false,
          autoReclaim: true,
        });
        if (assignRes.success) {
          autoAssignStats = assignRes.stats;
        }
      } catch (assignErr) {
        console.warn('Lỗi khi tự động gán nhân sự sau khi nhập SKUs:', assignErr);
      }
    }

    const assignSummary = autoAssignStats
      ? ` và tự động cấp phát ${autoAssignStats.selfAssignedCount + autoAssignStats.crossAssignedCount} license cho nhân sự!`
      : '!';

    return NextResponse.json({
      success: true,
      createdCount,
      updatedCount,
      batchCount,
      totalProcessed: skus.length,
      autoAssignStats,
      message: `Đã nhập thành công ${createdCount} bản quyền (bao gồm ${batchCount} đợt mua chi tiết) và cập nhật ${updatedCount} gói từ Microsoft 365${assignSummary}`,
    });
  } catch (error: any) {
    console.error('Lỗi khi nhập SKUs từ Cloud:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý máy chủ' }, { status: 500 });
  }
}
