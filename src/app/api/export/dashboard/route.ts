import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

// GET /api/export/dashboard - Full Multi-sheet System Summary Excel Report
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [assets, licenses, users, categories] = await Promise.all([
      prisma.asset.findMany({
        include: {
          category: true,
          location: true,
          assignments: { where: { returnedAt: null }, include: { user: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.license.findMany({
        include: { vendor: true, assignments: { where: { revokedAt: null }, include: { user: true } } },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.user.findMany({
        where: { isActive: true },
        include: {
          assetAssignments: { where: { returnedAt: null }, include: { asset: true } },
          licenseAssignments: { where: { revokedAt: null }, include: { license: true } },
        },
        orderBy: { fullName: 'asc' },
      }),
      prisma.assetCategory.findMany({ where: { isActive: true } }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Asset Management';
    workbook.created = new Date();

    // ================= SHEET 1: TỔNG QUAN HỆ THỐNG =================
    const summarySheet = workbook.addWorksheet('Báo Cáo Tổng Quan', { views: [{ showGridLines: true }] });
    summarySheet.mergeCells('A1:E1');
    const title = summarySheet.getCell('A1');
    title.value = 'BÁO CÁO TỔNG QUAN TÀI SẢN IT & TÌNH TRẠNG KHO BÃI / LICENSE';
    title.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    title.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(1).height = 35;

    summarySheet.mergeCells('A2:E2');
    const subtitle = summarySheet.getCell('A2');
    subtitle.value = `Thời gian lập báo cáo: ${new Date().toLocaleString('vi-VN')}`;
    subtitle.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subtitle.alignment = { vertical: 'middle', horizontal: 'center' };
    summarySheet.getRow(2).height = 20;

    summarySheet.addRow([]);

    // KPIs Block
    const availableAssets = assets.filter((a) => a.status === 'AVAILABLE');
    const inUseAssets = assets.filter((a) => a.status === 'IN_USE');
    const maintenanceAssets = assets.filter((a) => a.status === 'MAINTENANCE');

    const totalSeats = licenses.reduce((sum, l) => sum + l.totalSeats, 0);
    const usedSeats = licenses.reduce((sum, l) => sum + l.usedSeats, 0);
    const freeSeats = Math.max(0, totalSeats - usedSeats);

    const now = Date.now();
    const expiredLicenses = licenses.filter((l) => l.expiryDate && new Date(l.expiryDate).getTime() <= now);
    const expiringSoonLicenses = licenses.filter(
      (l) =>
        l.expiryDate &&
        new Date(l.expiryDate).getTime() > now &&
        new Date(l.expiryDate).getTime() - now < 30 * 24 * 60 * 60 * 1000
    );

    const kpis = [
      ['CHỈ SỐ TÀI SẢN & KHO HÀNG', 'GIÁ TRỊ', '', 'CHỈ SỐ LICENSE PHẦN MỀM', 'GIÁ TRỊ'],
      ['Tổng số lượng thiết bị phần cứng', assets.length, '', 'Tổng số bản quyền phần mềm', licenses.length],
      ['Thiết bị sẵn sàng trong kho (Cấp phát được ngay)', availableAssets.length, '', 'Tổng số seats bản quyền', totalSeats],
      ['Thiết bị đang cấp phát cho nhân viên', inUseAssets.length, '', 'Số seats đang sử dụng', usedSeats],
      ['Thiết bị đang gửi bảo dưỡng / sửa chữa', maintenanceAssets.length, '', 'Số seats còn trống để cấp phát', freeSeats],
      ['Tổng số nhân sự được quản lý', users.length, '', 'License sắp hết hạn (< 30 ngày)', expiringSoonLicenses.length],
      ['', '', '', 'License đã hết hạn', expiredLicenses.length],
    ];

    kpis.forEach((rowValues, idx) => {
      const r = summarySheet.addRow(rowValues);
      r.height = 22;
      if (idx === 0) {
        r.eachCell((c) => {
          c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
          c.alignment = { vertical: 'middle', horizontal: 'center' };
        });
      } else {
        r.getCell(1).font = { name: 'Arial', size: 10, bold: true };
        r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(2).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E40AF' } };
        r.getCell(4).font = { name: 'Arial', size: 10, bold: true };
        r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
        r.getCell(5).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF7C3AED' } };
      }
    });

    summarySheet.columns = [
      { width: 45 },
      { width: 16 },
      { width: 6 },
      { width: 45 },
      { width: 16 },
    ];

    // ================= SHEET 2: THIẾT BỊ TRONG KHO (SẴN SÀNG CẤP) =================
    const stockSheet = workbook.addWorksheet('Kho Sẵn Sàng Cấp Phát', { views: [{ showGridLines: true }] });
    stockSheet.addRow(['STT', 'Mã Tài Sản', 'Tên Thiết Bị', 'Danh Mục', 'Thương Hiệu', 'Model', 'Serial', 'Vị Trí Kho']);
    stockSheet.getRow(1).eachCell((c) => {
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    stockSheet.getRow(1).height = 25;

    availableAssets.forEach((a, i) => {
      const r = stockSheet.addRow([
        i + 1,
        a.assetTag,
        a.name,
        a.category?.name || '—',
        a.brand || '—',
        a.model || '—',
        a.serialNumber || '—',
        a.location?.name || 'Kho thiết bị',
      ]);
      r.height = 20;
      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    });
    stockSheet.columns = [{ width: 6 }, { width: 16 }, { width: 30 }, { width: 18 }, { width: 16 }, { width: 22 }, { width: 20 }, { width: 20 }];

    // ================= SHEET 3: LICENSE CẦN LƯU Ý (HẾT HẠN & SẮP HẾT HẠN) =================
    const alertLicSheet = workbook.addWorksheet('Cảnh Báo License Hạn Dùng', { views: [{ showGridLines: true }] });
    alertLicSheet.addRow(['STT', 'Tên Phần Mềm', 'License Key', 'Tình Trạng Hạn Dùng', 'Ngày Hết Hạn', 'Tổng Seats', 'Đã Dùng', 'Còn Trống', 'Nhà Cung Cấp']);
    alertLicSheet.getRow(1).eachCell((c) => {
      c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE11D48' } };
      c.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    alertLicSheet.getRow(1).height = 25;

    const criticalLicenses = [...expiredLicenses, ...expiringSoonLicenses];
    criticalLicenses.forEach((l, i) => {
      const isExp = l.expiryDate && new Date(l.expiryDate).getTime() <= now;
      const statusText = isExp ? 'ĐÃ HẾT HẠN' : 'SẮP HẾT HẠN (< 30 NGÀY)';
      const r = alertLicSheet.addRow([
        i + 1,
        l.name,
        l.licenseKey || '—',
        statusText,
        l.expiryDate ? new Date(l.expiryDate).toLocaleDateString('vi-VN') : '—',
        l.totalSeats,
        l.usedSeats,
        Math.max(0, l.totalSeats - l.usedSeats),
        l.vendor?.name || '—',
      ]);
      r.height = 20;
      r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r.getCell(4).font = { bold: true, color: { argb: isExp ? 'FFE11D48' : 'FFD97706' } };
      r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    });
    alertLicSheet.columns = [{ width: 6 }, { width: 30 }, { width: 25 }, { width: 25 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 22 }];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bao_Cao_Tong_Quan_IT_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export dashboard error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
