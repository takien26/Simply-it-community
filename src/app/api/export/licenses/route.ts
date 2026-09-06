import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import ExcelJS from 'exceljs';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const licenseType = searchParams.get('licenseType');
    const companyName = searchParams.get('companyName') || searchParams.get('company');
    const search = searchParams.get('search');
    const idsParam = searchParams.get('ids');

    const where: any = {};

    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    }

    if (status && status !== 'ALL') where.status = status;
    if (licenseType && licenseType !== 'ALL') where.licenseType = licenseType;
    if (companyName && companyName !== 'ALL') where.companyName = companyName;

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { licenseKey: { contains: s, mode: 'insensitive' } },
        { contractNumber: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const licenses = await prisma.license.findMany({
      where,
      include: {
        vendor: true,
        assignments: {
          where: { revokedAt: null },
          include: { user: true, asset: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Simply IT Management';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Danh Sách Bản Quyền License', {
      views: [{ showGridLines: true }],
    });

    // Style Title Header
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DANH SÁCH BẢN QUYỀN PHẦN MỀM & LICENSE IT';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6B21A8' }, // Purple
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // Subtitle
    sheet.mergeCells('A2:L2');
    const subCell = sheet.getCell('A2');
    const filterInfo = companyName ? ` | Bộ lọc Công ty: ${companyName}` : '';
    subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số lượng: ${licenses.length} gói bản quyền${filterInfo}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]);

    // Column Headers
    const headers = [
      'STT',
      'Tên Phần Mềm / Bản Quyền',
      'License Key / Mã Bản Quyền',
      'Loại License',
      'Trạng Thái',
      'Tổng Seats',
      'Đã Cấp',
      'Còn Trống',
      'Công Ty Quản Lý',
      'Người / Thiết Bị Sử Dụng (Kèm Phòng Ban)',
      'Hạn Sử Dụng',
      'Nhà Cung Cấp / Đối Tác',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF9333EA' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF581C87' } },
      };
    });

    licenses.forEach((lic, index) => {
      const activeAssignments = lic.assignments || [];
      const used = lic.usedSeats || activeAssignments.length || 0;
      const remainingSeats = Math.max(0, (lic.totalSeats || 1) - used);

      const assignedTargets = activeAssignments
        .map((a) => {
          if (a.user) {
            const dept = a.user.department ? ` (${a.user.department})` : '';
            return `${a.user.fullName}${dept}`;
          }
          if (a.asset) {
            return `[Thiết bị: ${a.asset.assetTag} - ${a.asset.name}]`;
          }
          return '';
        })
        .filter(Boolean)
        .join('; ');

      let expiryText = 'Vĩnh viễn (Perpetual)';
      if (lic.expiryDate) {
        const isExp = new Date(lic.expiryDate).getTime() < Date.now();
        expiryText = `${new Date(lic.expiryDate).toLocaleDateString('vi-VN')}${isExp ? ' [ĐÃ HẾT HẠN]' : ''}`;
      }

      const row = sheet.addRow([
        index + 1,
        lic.name,
        lic.licenseKey || '—',
        lic.licenseType || 'PERPETUAL',
        lic.status === 'ACTIVE' ? 'Đang hoạt động' : lic.status === 'EXPIRED' ? 'Hết hạn' : lic.status,
        lic.totalSeats || 1,
        used,
        remainingSeats,
        lic.companyName || 'Toàn tập đoàn',
        assignedTargets || 'Chưa gán',
        expiryText,
        lic.vendor?.name || '—',
      ]);

      row.height = 24;
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };

      if (index % 2 === 1) {
        row.eachCell((c) => {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFAF5FF' },
          };
        });
      }
    });

    sheet.columns = [
      { width: 6 },  // STT
      { width: 32 }, // Tên phần mềm
      { width: 28 }, // Key
      { width: 16 }, // Loại
      { width: 16 }, // Trạng thái
      { width: 12 }, // Tổng
      { width: 12 }, // Đã dùng
      { width: 12 }, // Còn
      { width: 25 }, // Công ty
      { width: 38 }, // Người dùng kèm phòng ban
      { width: 20 }, // Hạn dùng
      { width: 25 }, // Vendor
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Danh_Sach_License_IT_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export licenses error:', error);
    return NextResponse.json({ error: 'Xuất file Excel thất bại' }, { status: 500 });
  }
}
