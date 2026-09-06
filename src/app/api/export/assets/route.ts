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
    const categoryId = searchParams.get('categoryId');
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
    if (categoryId && categoryId !== 'ALL') where.categoryId = categoryId;
    if (companyName && companyName !== 'ALL') where.companyName = companyName;

    if (search && search.trim()) {
      const s = search.trim();
      where.OR = [
        { assetTag: { contains: s, mode: 'insensitive' } },
        { name: { contains: s, mode: 'insensitive' } },
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
        { contractNumber: { contains: s, mode: 'insensitive' } },
        { invoiceNumber: { contains: s, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        category: true,
        vendor: true,
        location: true,
        assignments: {
          where: { returnedAt: null },
          include: { user: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Simply IT Management';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Danh Sách Tài Sản IT', {
      views: [{ showGridLines: true }],
    });

    // Style Title Header
    sheet.mergeCells('A1:O1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'DANH SÁCH TÀI SẢN & THIẾT BỊ CÔNG NGHỆ THÔNG TIN';
    titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 35;

    // Subtitle
    sheet.mergeCells('A2:O2');
    const subCell = sheet.getCell('A2');
    const filterInfo = companyName ? ` | Bộ lọc Công ty: ${companyName}` : '';
    subCell.value = `Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Tổng số lượng: ${assets.length} thiết bị${filterInfo}`;
    subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 20;

    sheet.addRow([]); // Blank line

    // Column Headers
    const headers = [
      'STT',
      'Mã Tài Sản',
      'Tên Thiết Bị & Model',
      'Danh Mục',
      'Số Serial',
      'Trạng Thái',
      'Tình Trạng',
      'Công Ty Quản Lý',
      'Người Đang Giữ / Sử Dụng',
      'Phòng Ban Người Dùng',
      'Vị Trí / Kho Lưu Trữ',
      'Nguyên Giá Mua (VND)',
      'Hạn Bảo Hành',
      'Số Hợp Đồng / Hóa Đơn',
      'Cấu Hình Chi Tiết (Specs)',
    ];

    const headerRow = sheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF2563EB' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      };
    });

    const statusMap: Record<string, string> = {
      AVAILABLE: 'Sẵn sàng trong kho',
      IN_USE: 'Đang sử dụng',
      MAINTENANCE: 'Đang bảo trì',
      RETIRED: 'Đã thanh lý',
      LOST: 'Thất lạc / Mất',
    };

    const conditionMap: Record<string, string> = {
      NEW: 'Mới 100%',
      GOOD: 'Tốt (Đang dùng tốt)',
      FAIR: 'Trung bình (Cũ)',
      POOR: 'Kém (Cần sửa/nâng cấp)',
      BROKEN: 'Hỏng hóc',
    };

    // Populate Rows
    assets.forEach((asset, index) => {
      const assignedUser = asset.assignments?.[0]?.user;
      const holderName = assignedUser ? assignedUser.fullName : 'Sẵn sàng trong kho';
      const holderDept = assignedUser?.department || (assignedUser ? 'Nhân sự' : 'Kho IT');

      const specsObj = asset.specs && typeof asset.specs === 'object' ? asset.specs : {};
      const specsText = Object.entries(specsObj)
        .filter(([k]) => !['autoScanned', 'source', 'paymentHistory'].includes(k))
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      const contractInvoice = [asset.contractNumber, asset.invoiceNumber].filter(Boolean).join(' / ') || '—';

      let warrantyText = 'Không có BH';
      if (asset.warrantyExpiry) {
        warrantyText = new Date(asset.warrantyExpiry).toLocaleDateString('vi-VN');
      }

      const row = sheet.addRow([
        index + 1,
        asset.assetTag,
        `${asset.name}${asset.brand || asset.model ? ` (${[asset.brand, asset.model].filter(Boolean).join(' - ')})` : ''}`,
        asset.category?.name || 'Chưa phân loại',
        asset.serialNumber || '—',
        statusMap[asset.status] || asset.status,
        conditionMap[asset.condition] || asset.condition,
        asset.companyName || '—',
        holderName,
        holderDept,
        asset.location?.name || 'Kho IT',
        asset.purchasePrice ? Number(asset.purchasePrice) : 0,
        warrantyText,
        contractInvoice,
        specsText || '—',
      ]);

      row.height = 24;
      row.alignment = { vertical: 'middle' };
      row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(12).numFmt = '#,##0 "₫"';
      row.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };

      // Alternate row background
      if (index % 2 === 1) {
        row.eachCell((c) => {
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        });
      }
    });

    sheet.columns = [
      { width: 6 },  // STT
      { width: 14 }, // Tag
      { width: 32 }, // Tên & Model
      { width: 20 }, // Danh mục
      { width: 18 }, // Serial
      { width: 20 }, // Trạng thái
      { width: 18 }, // Tình trạng
      { width: 25 }, // Công ty quản lý
      { width: 24 }, // Người đang giữ
      { width: 22 }, // Phòng ban người dùng
      { width: 20 }, // Vị trí
      { width: 18 }, // Giá mua
      { width: 15 }, // Bảo hành
      { width: 22 }, // HĐ / Hóa đơn
      { width: 35 }, // Specs
    ];

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Danh_Sach_Tai_San_IT_${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  } catch (error) {
    console.error('Export assets error:', error);
    return NextResponse.json({ error: 'Xuất file Excel thất bại' }, { status: 500 });
  }
}
