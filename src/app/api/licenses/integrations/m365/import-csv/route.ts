import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { normalizeCompanyName } from '@/lib/normalize';
import { LicenseType, LicenseStatus } from '@prisma/client';

export interface ParsedCsvLicenseItem {
  id?: string;
  productName: string;
  totalSeats: number;
  assignedSeats: number;
  availableSeats: number;
  status: LicenseStatus;
  rawStatus: string;
  expiryDate: string | null;
  licenseType: LicenseType;
  category: string;
  companyName?: string;
}

/**
 * Hàm phân tích file CSV xuất từ trang Microsoft 365 Admin Center (admin.cloud.microsoft / admin.microsoft.com)
 * Hỗ trợ song ngữ Tiếng Việt và Tiếng Anh
 */
function parseM365Csv(csvText: string): ParsedCsvLicenseItem[] {
  // Loại bỏ BOM (\uFEFF) nếu có
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const delimiter = lines[0].includes(';') ? ';' : ',';

  function parseLine(line: string): string[] {
    const res: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        res.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    res.push(current.trim());
    return res;
  }

  const rawHeaders = parseLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/["']/g, '').trim());

  const findIdx = (keywords: string[]) => {
    return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
  };

  const nameIdx = findIdx(['tên sản phẩm', 'product name', 'subscription name', 'tên', 'product', 'subscription']);
  const qtyIdx = findIdx(['số lượng đã mua', 'số lượng', 'purchased quantity', 'quantity', 'total licenses', 'prepaid', 'giấy phép']);
  const assignedIdx = findIdx(['giấy phép đã gán', 'đã gán', 'assigned licenses', 'assigned', 'consumed']);
  const availIdx = findIdx(['giấy phép có sẵn', 'có sẵn', 'available licenses', 'available']);
  const statusIdx = findIdx(['trạng thái đăng ký', 'trạng thái', 'subscription status', 'status']);
  const expiryIdx = findIdx(['ngày gia hạn hoặc hết hạn', 'ngày gia hạn', 'ngày hết hạn', 'expiration date', 'renewal date', 'expiry']);

  const results: ParsedCsvLicenseItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseLine(lines[i]);
    const rawName = (nameIdx >= 0 ? cols[nameIdx] : cols[0])?.trim();
    if (!rawName) continue;

    const rawQty = qtyIdx >= 0 ? cols[qtyIdx] : cols[2];
    const rawAssigned = assignedIdx >= 0 ? cols[assignedIdx] : cols[1];
    const rawAvail = availIdx >= 0 ? cols[availIdx] : cols[3];
    const rawStatus = (statusIdx >= 0 ? cols[statusIdx] : cols[4]) || 'Đang hoạt động';
    const rawExpiry = expiryIdx >= 0 ? cols[expiryIdx] : cols[5];

    const parseNum = (val: string | undefined): number => {
      if (!val) return 0;
      const clean = val.replace(/[^0-9]/g, '');
      const n = parseInt(clean, 10);
      return isNaN(n) ? 0 : n;
    };

    const totalSeats = parseNum(rawQty) || 1;
    const assignedSeats = parseNum(rawAssigned);
    const availableSeats = parseNum(rawAvail);

    // Nhận diện loại bản quyền: Vĩnh viễn (Perpetual) vs Thuê bao (Subscription)
    const nameLower = rawName.toLowerCase();
    const isPerpetual =
      nameLower.includes('ggwa') ||
      nameLower.includes('windows 10') ||
      nameLower.includes('windows 11') ||
      nameLower.includes('ltsc') ||
      nameLower.includes('server') ||
      nameLower.includes('cal') ||
      nameLower.includes('standard 202') ||
      nameLower.includes('standard 201') ||
      nameLower.includes('office 202') ||
      nameLower.includes('perpetual');

    let category = 'Bản quyền đám mây SaaS';
    if (nameLower.includes('server') || nameLower.includes('cal')) {
      category = 'Máy chủ & Hạ tầng (Server / CAL)';
    } else if (nameLower.includes('windows') || nameLower.includes('ggwa')) {
      category = 'Hệ điều hành (Windows OS)';
    } else if (nameLower.includes('office') || nameLower.includes('ltsc')) {
      category = 'Bộ ứng dụng văn phòng (Office Suite)';
    }

    let status: LicenseStatus = 'ACTIVE';
    const statusLower = rawStatus.toLowerCase();
    if (statusLower.includes('hết hạn') || statusLower.includes('expired')) {
      status = 'EXPIRED';
    } else if (statusLower.includes('tạm ngưng') || statusLower.includes('suspended')) {
      status = 'SUSPENDED';
    }

    results.push({
      productName: rawName,
      totalSeats,
      assignedSeats,
      availableSeats,
      status,
      rawStatus,
      expiryDate: rawExpiry && !rawExpiry.includes('Không') && !rawExpiry.includes('N/A') ? rawExpiry : null,
      licenseType: isPerpetual ? 'PERPETUAL' : 'SUBSCRIPTION',
      category,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage = currentUser.roleName === 'Admin' || (await hasPermission(currentUser.userId, 'licenses.create'));
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden: Bạn không có quyền nhập bản quyền' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'PARSE';

    // ==================== ACTION 1: PARSE CSV PREVIEW ====================
    if (action === 'PARSE') {
      const csvText = typeof body.csvText === 'string' ? body.csvText : '';
      if (!csvText.trim()) {
        return NextResponse.json({ error: 'Nội dung file CSV trống. Vui lòng chọn file hợp lệ.' }, { status: 400 });
      }

      const items = parseM365Csv(csvText);
      if (items.length === 0) {
        return NextResponse.json({
          error: 'Không tìm thấy dữ liệu bản quyền nào trong file CSV. Vui lòng đảm bảo file được xuất từ mục "Sản phẩm của bạn" trên Microsoft 365 admin center.',
        }, { status: 400 });
      }

      const perpetualCount = items.filter((i) => i.licenseType === 'PERPETUAL').length;
      const subscriptionCount = items.filter((i) => i.licenseType === 'SUBSCRIPTION').length;
      const totalSeats = items.reduce((sum, i) => sum + i.totalSeats, 0);

      return NextResponse.json({
        success: true,
        totalItems: items.length,
        items,
        summary: {
          perpetualCount,
          subscriptionCount,
          totalSeats,
        },
      });
    }

    // ==================== ACTION 2: IMPORT ITEMS INTO ITAM ====================
    if (action === 'IMPORT') {
      const items: ParsedCsvLicenseItem[] = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return NextResponse.json({ error: 'Danh sách sản phẩm cần nạp trống.' }, { status: 400 });
      }

      // 1. Tìm hoặc tạo Vendor Microsoft Corporation
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
            contactPerson: 'Microsoft Partner / Enterprise Support',
            email: 'support@microsoft.com',
            website: 'https://admin.microsoft.com',
            notes: 'Nhà cung cấp bản quyền Microsoft (Tự động khởi tạo từ file CSV M365)',
          },
        });
      }

      // 2. Xác định công ty mặc định
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

      const customCompany = body.companyName ? normalizeCompanyName(body.companyName) : defaultCompany;

      // 3. Nhập và liên kết các đợt (Batches)
      let createdCount = 0;
      let updatedCount = 0;
      let batchCount = 0;
      const now = new Date();

      // Đếm số lần xuất hiện của từng tên sản phẩm trong danh sách nạp này để tạo đợt nếu có trùng lặp
      const seenCountByName = new Map<string, number>();

      for (const item of items) {
        const name = item.productName.trim();
        const totalSeats = Number(item.totalSeats) || 1;
        const currentSeen = (seenCountByName.get(name.toLowerCase()) || 0) + 1;
        seenCountByName.set(name.toLowerCase(), currentSeen);

        // Tìm master license trong CSDL
        const existingMaster = await prisma.license.findFirst({
          where: {
            parentLicenseId: null,
            name: { equals: name, mode: 'insensitive' },
          },
          include: { batches: true },
        });

        // Xử lý ngày hết hạn nếu có format ngày hợp lệ
        let parsedExpiryDate: Date | null = null;
        if (item.expiryDate) {
          try {
            const parts = item.expiryDate.split(/[\/\-]/);
            if (parts.length === 3) {
              // DD/MM/YYYY
              const d = parseInt(parts[0], 10);
              const m = parseInt(parts[1], 10) - 1;
              const y = parseInt(parts[2], 10);
              const dt = new Date(y, m, d);
              if (!isNaN(dt.getTime())) parsedExpiryDate = dt;
            } else {
              const dt = new Date(item.expiryDate);
              if (!isNaN(dt.getTime())) parsedExpiryDate = dt;
            }
          } catch {}
        }

        if (!existingMaster) {
          // Tạo mới Master License
          await prisma.license.create({
            data: {
              name,
              licenseKey: name.includes('GGWA') ? 'GGWA-PRO' : name,
              licenseType: item.licenseType,
              totalSeats,
              usedSeats: item.assignedSeats || 0,
              purchaseDate: now,
              expiryDate: parsedExpiryDate,
              vendorId: vendor.id,
              companyName: item.companyName ? normalizeCompanyName(item.companyName) : customCompany,
              status: item.status,
              specs: {
                cloudProvider: 'm365',
                source: 'm365_csv_import',
                category: item.category,
                rawStatus: item.rawStatus,
                importedAt: now.toISOString(),
              },
              notes: `Bản quyền tự động nạp từ file CSV Microsoft 365 Admin Center (${item.category})`,
            },
          });
          createdCount++;
        } else {
          // Nếu đã có master license:
          // Nếu đây là dòng xuất hiện lặp lại của cùng 1 sản phẩm trong file (vd: GGWA 46 và GGWA 110)
          // hoặc master đã có, thì thêm dưới dạng Đợt con (Batch)
          if (currentSeen > 1 || existingMaster.batches.length > 0) {
            const batchNum = existingMaster.batches.length + 1;
            await prisma.license.create({
              data: {
                name: `${name} (Đợt ${batchNum} - Bổ sung ${totalSeats} seats)`,
                parentLicenseId: existingMaster.id,
                licenseKey: existingMaster.licenseKey || name,
                licenseType: item.licenseType,
                totalSeats,
                usedSeats: item.assignedSeats || 0,
                purchaseDate: now,
                expiryDate: parsedExpiryDate,
                vendorId: vendor.id,
                companyName: item.companyName ? normalizeCompanyName(item.companyName) : customCompany,
                status: item.status,
                specs: {
                  cloudProvider: 'm365',
                  source: 'm365_csv_import_batch',
                  batchNumber: batchNum,
                  category: item.category,
                  rawStatus: item.rawStatus,
                  importedAt: now.toISOString(),
                },
                notes: `Đợt bổ sung mua thêm tự động nạp từ file CSV Microsoft 365 Admin Center`,
              },
            });
            batchCount++;
          } else {
            // Cập nhật số lượng của Master License nếu đây là lần nạp cập nhật
            await prisma.license.update({
              where: { id: existingMaster.id },
              data: {
                totalSeats,
                usedSeats: item.assignedSeats || existingMaster.usedSeats,
                status: item.status,
                expiryDate: parsedExpiryDate || existingMaster.expiryDate,
                specs: {
                  ...((existingMaster.specs as object) || {}),
                  cloudProvider: 'm365',
                  source: 'm365_csv_import',
                  category: item.category,
                  rawStatus: item.rawStatus,
                  lastSyncedCsvAt: now.toISOString(),
                },
              },
            });
            updatedCount++;
          }
        }
      }

      await createAuditLog({
        userId: currentUser.userId,
        action: 'IMPORT',
        entityType: 'LICENSE',
        entityId: 'M365_CSV_IMPORT',
        changes: {
          message: `Đã nạp ${items.length} bản quyền từ file CSV Microsoft 365 Admin Center (${createdCount} mới, ${batchCount} đợt con, ${updatedCount} cập nhật)`,
          total: items.length,
          createdCount,
          batchCount,
          updatedCount,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Đã nhập thành công ${items.length} bản quyền từ Microsoft 365 Admin Center vào ITAM (${createdCount} gói mới, ${batchCount} đợt bổ sung, ${updatedCount} gói cập nhật)!`,
        stats: {
          total: items.length,
          createdCount,
          batchCount,
          updatedCount,
        },
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Lỗi API M365 CSV Import:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý file CSV từ máy chủ' }, { status: 500 });
  }
}
