import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import * as ExcelJS from 'exceljs';
import { syncCorporateCompanies } from '@/lib/services/excel-import';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const canImport = await hasPermission(user.userId, 'services.import');
    if (!canImport && user.roleName !== 'Admin') {
      return NextResponse.json({ error: 'Bạn không có quyền import dịch vụ IT' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Vui lòng tải lên file Excel (.xlsx)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'File Excel không có dữ liệu sheet hợp lệ' }, { status: 400 });
    }

    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const val = cell.value?.toString().trim().toLowerCase() || '';
      if (val.includes('mã dịch vụ') || val.includes('ma dich vu') || val.includes('service code') || val.includes('mã gói')) {
        colMap.serviceCode = colNumber;
      } else if (val.includes('tên gói') || val.includes('ten goi') || val.includes('tên dịch vụ') || val.includes('ten dich vu') || val.includes('service name')) {
        colMap.name = colNumber;
      } else if (val.includes('loại dịch vụ') || val.includes('loai dich vu') || val.includes('phân loại') || val.includes('phan loai') || val.includes('service type')) {
        colMap.serviceType = colNumber;
      } else if (val.includes('giá cước') || val.includes('gia cuoc') || val.includes('chi phí') || val.includes('chi phi') || val.includes('cost')) {
        colMap.cost = colNumber;
      } else if (val.includes('chu kỳ') || val.includes('chu ky') || val.includes('billing cycle')) {
        colMap.billingCycle = colNumber;
      } else if (val.includes('bắt đầu') || val.includes('bat dau') || val.includes('start date')) {
        colMap.startDate = colNumber;
      } else if (val.includes('gia hạn') || val.includes('gia han') || val.includes('renewal date')) {
        colMap.renewalDate = colNumber;
      } else if (val.includes('thuê bao') || val.includes('thue bao') || val.includes('khách hàng') || val.includes('account')) {
        colMap.accountNumber = colNumber;
      } else if (val.includes('ip') || val.includes('tĩnh') || val.includes('tinh')) {
        colMap.ipStatic = colNumber;
      } else if (val.includes('băng thông') || val.includes('bang thong') || val.includes('bandwidth') || val.includes('thông số')) {
        colMap.bandwidth = colNumber;
      } else if (val.includes('nhà mạng') || val.includes('nha mang') || val.includes('nhà cung cấp') || val.includes('nha cung cap') || val.includes('đối tác') || val.includes('vendor')) {
        colMap.vendorName = colNumber;
      } else if (val.includes('công ty') || val.includes('cong ty') || val.includes('pháp nhân') || val.includes('phap nhan') || val.includes('company')) {
        colMap.companyName = colNumber;
      } else if (val.includes('vị trí') || val.includes('vi tri') || val.includes('địa điểm') || val.includes('lắp đặt') || val.includes('location')) {
        colMap.locationName = colNumber;
      } else if (val.includes('hotline') || val.includes('hỗ trợ') || val.includes('ho tro') || val.includes('contact')) {
        colMap.contactSupport = colNumber;
      } else if (val.includes('ghi chú') || val.includes('ghi chu') || val.includes('note')) {
        colMap.notes = colNumber;
      }
    });

    const getCellStr = (row: ExcelJS.Row, colIdx?: number, fallbackIdx?: number): string | null => {
      const idx = colIdx || fallbackIdx;
      if (!idx) return null;
      const cell = row.getCell(idx);
      if (cell.value === null || cell.value === undefined) return null;
      if (typeof cell.value === 'object') {
        if ('text' in cell.value && typeof cell.value.text === 'string') return cell.value.text.trim();
        if ('result' in cell.value) return String(cell.value.result ?? '').trim();
      }
      return String(cell.value).trim();
    };

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const serviceCode = getCellStr(row, colMap.serviceCode, 1);
      const name = getCellStr(row, colMap.name, 2);
      const serviceType = getCellStr(row, colMap.serviceType, 3);
      const costRaw = getCellStr(row, colMap.cost, 4);
      const billingCycle = getCellStr(row, colMap.billingCycle, 5);
      const startDateRaw = getCellStr(row, colMap.startDate, 6);
      const renewalDateRaw = getCellStr(row, colMap.renewalDate, 7);
      const accountNumber = getCellStr(row, colMap.accountNumber, 8);
      const ipStatic = getCellStr(row, colMap.ipStatic, 9);
      const bandwidth = getCellStr(row, colMap.bandwidth, 10);
      const vendorName = getCellStr(row, colMap.vendorName, 11);
      const companyName = getCellStr(row, colMap.companyName, 12);
      const locationName = getCellStr(row, colMap.locationName, 13);
      const contactSupport = getCellStr(row, colMap.contactSupport, 14);
      const notes = getCellStr(row, colMap.notes, 15);

      if (serviceCode || name) {
        rows.push({
          serviceCode: serviceCode || '',
          name: name || '',
          serviceType: (serviceType || 'INTERNET').toUpperCase(),
          cost: costRaw ? parseFloat(costRaw.replace(/[^0-9.-]+/g, '')) : null,
          billingCycle: (billingCycle || 'MONTHLY').toUpperCase(),
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          renewalDate: renewalDateRaw ? new Date(renewalDateRaw) : null,
          accountNumber,
          ipStatic,
          bandwidth,
          vendorName,
          companyName,
          locationName,
          contactSupport,
          notes,
        });
      }
    });

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy dòng dữ liệu nào trong file Excel' }, { status: 400 });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    const existingCount = await prisma.iTService.count();
    const newCompanies = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        const code = r.serviceCode || `SVC-IT-${String(existingCount + i + 1).padStart(4, '0')}`;
        const name = r.name || 'Dịch vụ IT Import';

        // Resolve vendor
        let vendorId: string | null = null;
        if (r.vendorName) {
          const vendor = await prisma.vendor.upsert({
            where: { id: '00000000-0000-0000-0000-000000000000' }, // fallback
            update: {},
            create: { name: r.vendorName },
          }).catch(async () => {
            const found = await prisma.vendor.findFirst({ where: { name: r.vendorName } });
            if (found) return found;
            return prisma.vendor.create({ data: { name: r.vendorName } });
          });
          vendorId = vendor?.id || null;
        }

        // Resolve location
        let locationId: string | null = null;
        if (r.locationName) {
          const loc = await prisma.location.findFirst({ where: { name: r.locationName } }) ||
                      await prisma.location.create({ data: { name: r.locationName } });
          locationId = loc?.id || null;
        }

        // Validate type enum
        const validTypes = ['INTERNET', 'CLOUD_HOSTING', 'DOMAIN_SSL', 'EMAIL_COMMUNICATION', 'MAINTENANCE_SLA', 'TELECOM_VOIP', 'SOFTWARE_SAAS', 'OTHER'];
        const sType = validTypes.includes(r.serviceType) ? r.serviceType : 'INTERNET';

        // Validate cycle enum
        const validCycles = ['MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL', 'BIENNIAL', 'TRIENNIAL', 'ONE_TIME'];
        const bCycle = validCycles.includes(r.billingCycle) ? r.billingCycle : 'MONTHLY';

        await prisma.iTService.upsert({
          where: { serviceCode: code },
          update: {
            name,
            serviceType: sType as any,
            cost: r.cost,
            billingCycle: bCycle as any,
            startDate: r.startDate,
            renewalDate: r.renewalDate,
            accountNumber: r.accountNumber,
            vendorId,
            companyName: r.companyName,
            locationId,
            contactSupport: r.contactSupport,
            specs: {
              bandwidth: r.bandwidth || undefined,
              ipStatic: r.ipStatic || undefined,
            },
            notes: r.notes,
          },
          create: {
            serviceCode: code,
            name,
            serviceType: sType as any,
            status: 'ACTIVE',
            cost: r.cost,
            billingCycle: bCycle as any,
            startDate: r.startDate || new Date(),
            renewalDate: r.renewalDate,
            accountNumber: r.accountNumber,
            vendorId,
            companyName: r.companyName,
            locationId,
            contactSupport: r.contactSupport,
            specs: {
              bandwidth: r.bandwidth || undefined,
              ipStatic: r.ipStatic || undefined,
            },
            notes: r.notes ? `[Import Excel] ${r.notes}` : '[Import Excel]',
            createdById: user.userId,
          },
        });

        if (r.companyName) {
          newCompanies.add(r.companyName);
        }

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Dòng ${i + 2}: ${err.message}`);
      }
    }

    if (newCompanies.size > 0) {
      await syncCorporateCompanies(newCompanies);
    }

    return NextResponse.json({
      success: true,
      message: `Đã import thành công ${successCount}/${rows.length} gói dịch vụ IT.`,
      successCount,
      errorCount,
      errors: errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('Import services error:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý file Excel' }, { status: 500 });
  }
}
