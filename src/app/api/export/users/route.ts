import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

// GET /api/export/users - Export Staff & Equipment Allocations to Excel
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        role: true,
        assetAssignments: {
          where: { returnedAt: null },
          include: { asset: true },
        },
        licenseAssignments: {
          where: { revokedAt: null },
          include: { license: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'IT Asset Management';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Nhân Sự & Bàn Giao Thiết Bị', {
      views: [{ showGridLines: true }],
    });

    // Title Header
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DANH SÁCH NHÂN SỰ & THIẾT BỊ / LICENSE ĐÃ BÀN GIAO';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }, // Teal
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // Subtitle
    sheet.mergeCells('A2:H2');
    const subCell = sheet.getCell('A2');
    subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số nhân sự: ${users.length}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    const headers = [
      'STT',
      'Họ Và Tên',
      'Công Ty Quản Lý',
      'Chức Danh / Vị Trí',
      'Phòng Ban',
      'Email Đăng Nhập',
      'Số Điện Thoại',
      'Thiết Bị Đang Giữ',
      'License Đang Sử Dụng',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14B8A6' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    users.forEach((u, index) => {
      const assetsList = u.assetAssignments
        .map((a) => `[${a.asset.assetTag}] ${a.asset.name}`)
        .join('; ');

      const licensesList = u.licenseAssignments
        .map((la) => la.license.name)
        .join('; ');

      const row = sheet.addRow([
        index + 1,
        u.fullName,
        u.companyName || '—',
        u.position || '—',
        u.department || '—',
        u.email,
        u.phone || '—',
        assetsList || 'Chưa giữ thiết bị',
        licensesList || 'Chưa cấp license',
      ]);

      row.height = 22;
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

      if (index % 2 === 1) {
        row.eachCell((c) => {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDFA' },
          };
        });
      }
    });

    sheet.columns = [
      { width: 6 },
      { width: 24 },
      { width: 30 },
      { width: 22 },
      { width: 22 },
      { width: 28 },
      { width: 16 },
      { width: 35 },
      { width: 35 },
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Danh_Sach_Nhan_Su_Cap_Phat_${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export users error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
