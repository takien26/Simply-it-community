import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';
import * as ExcelJS from 'exceljs';

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

    const rows: any[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      const values: any = row.values;
      // values[1] = Mã dịch vụ
      // values[2] = Tên gói dịch vụ
      // values[3] = Phân loại (INTERNET, CLOUD_HOSTING, DOMAIN_SSL, EMAIL_COMMUNICATION, TELECOM_VOIP, MAINTENANCE_SLA, SOFTWARE_SAAS, OTHER)
      // values[4] = Chi phí (VNĐ)
      // values[5] = Chu kỳ (MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL, BIENNIAL, TRIENNIAL, ONE_TIME)
      // values[6] = Ngày bắt đầu (YYYY-MM-DD)
      // values[7] = Ngày gia hạn (YYYY-MM-DD)
      // values[8] = Mã thuê bao / KH
      // values[9] = IP Tĩnh / Cấu hình
      // values[10] = Băng thông / Thông số
      // values[11] = Nhà mạng / Đối tác
      // values[12] = Công ty quản lý
      // values[13] = Vị trí / Địa điểm
      // values[14] = Hotline hỗ trợ
      // values[15] = Ghi chú

      if (values[1] || values[2]) {
        rows.push({
          serviceCode: String(values[1] || '').trim(),
          name: String(values[2] || '').trim(),
          serviceType: String(values[3] || 'INTERNET').trim().toUpperCase(),
          cost: values[4] ? parseFloat(String(values[4]).replace(/[^0-9.-]+/g, '')) : null,
          billingCycle: String(values[5] || 'MONTHLY').trim().toUpperCase(),
          startDate: values[6] ? new Date(values[6]) : null,
          renewalDate: values[7] ? new Date(values[7]) : null,
          accountNumber: values[8] ? String(values[8]).trim() : null,
          ipStatic: values[9] ? String(values[9]).trim() : null,
          bandwidth: values[10] ? String(values[10]).trim() : null,
          vendorName: values[11] ? String(values[11]).trim() : null,
          companyName: values[12] ? String(values[12]).trim() : null,
          locationName: values[13] ? String(values[13]).trim() : null,
          contactSupport: values[14] ? String(values[14]).trim() : null,
          notes: values[15] ? String(values[15]).trim() : null,
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

        successCount++;
      } catch (err: any) {
        errorCount++;
        errors.push(`Dòng ${i + 2}: ${err.message}`);
      }
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
