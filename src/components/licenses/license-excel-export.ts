import ExcelJS from 'exceljs';
import { LicenseGroup, CompanyLicenseStat, formatPrice } from './types';
import { formatDate } from '@/lib/utils';

interface ExportConglomerateOptions {
  groupedLicenses: LicenseGroup[];
  selectedCompany?: string;
  selectedCurrency: string;
  companiesList?: string[];
}

/**
 * Xuất Báo Cáo Ma Trận Bản Quyền Toàn Tập Đoàn (Conglomerate SAM Multi-Sheet Workbook)
 * Chuẩn quốc tế theo mô hình ServiceNow SAM Pro & Flexera One
 */
export async function exportConglomerateExcel({
  groupedLicenses,
  selectedCompany,
  selectedCurrency,
}: ExportConglomerateOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Simply IT [Enterprise Edition]';
  workbook.lastModifiedBy = 'Simply IT SAM Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Thu thập danh sách tất cả công ty xuất hiện trong các nhóm bản quyền
  const companySet = new Set<string>();
  groupedLicenses.forEach((g) => {
    (g.companyStats || []).forEach((cs) => {
      if (cs.companyName && cs.companyName.trim()) {
        companySet.add(cs.companyName.trim());
      }
    });
  });

  let matrixCompanies = Array.from(companySet);
  if (selectedCompany && matrixCompanies.includes(selectedCompany)) {
    // Đưa công ty được chọn lên đầu tiên
    matrixCompanies = [selectedCompany, ...matrixCompanies.filter((c) => c !== selectedCompany)];
  }

  // ==========================================
  // SHEET 1: MA TRẬN CÂN ĐỐI TẬP ĐOÀN (EXECUTIVE SUMMARY)
  // ==========================================
  const sheet1 = workbook.addWorksheet('1. Ma Trận Cân Đối Tập Đoàn', {
    views: [{ showGridLines: true }],
  });

  // Header Title Banner
  const totalCols = 6 + matrixCompanies.length * 3 + 1; // STT, Name, Type, Pool(3), Companies(N*3), Cost
  sheet1.mergeCells(1, 1, 1, totalCols);
  const title1 = sheet1.getCell(1, 1);
  title1.value = 'BÁO CÁO MA TRẬN CÂN ĐỐI BẢN QUYỀN PHẦN MỀM TẬP ĐOÀN (SAM CONGLOMERATE MATRIX)';
  title1.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B0764' } }; // Deep Royal Purple
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(1).height = 36;

  sheet1.mergeCells(2, 1, 2, totalCols);
  const sub1 = sheet1.getCell(2, 1);
  const compSubtitle = selectedCompany ? `Báo cáo trọng tâm: ${selectedCompany} | ` : 'Phạm vi: Toàn tập đoàn (Tất cả công ty thành viên) | ';
  sub1.value = `${compSubtitle}Thời gian xuất: ${new Date().toLocaleString('vi-VN')} | Đơn vị tiền tệ: ${selectedCurrency} | Tổng số gói bản quyền: ${groupedLicenses.length}`;
  sub1.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(2).height = 22;

  sheet1.addRow([]); // Row 3 trống

  // Tier 1 Header (Row 4) & Tier 2 Header (Row 5)
  // Row 4
  const row4 = sheet1.getRow(4);
  const row5 = sheet1.getRow(5);
  row4.height = 24;
  row5.height = 24;

  // Cột 1: STT
  sheet1.mergeCells(4, 1, 5, 1);
  sheet1.getCell(4, 1).value = 'STT';

  // Cột 2: Tên Phần Mềm
  sheet1.mergeCells(4, 2, 5, 2);
  sheet1.getCell(4, 2).value = 'TÊN PHẦN MỀM / BẢN QUYỀN';

  // Cột 3: Loại License
  sheet1.mergeCells(4, 3, 5, 3);
  sheet1.getCell(4, 3).value = 'LOẠI LICENSE';

  // Cột 4, 5, 6: TOÀN TẬP ĐOÀN (POOL CHUNG)
  sheet1.mergeCells(4, 4, 4, 6);
  sheet1.getCell(4, 4).value = 'TOÀN TẬP ĐOÀN (POOL CHUNG)';
  sheet1.getCell(5, 4).value = 'Tổng Mua';
  sheet1.getCell(5, 5).value = 'Đang Dùng';
  sheet1.getCell(5, 6).value = 'Cân Đối (Dư/Thiếu)';

  // Các cột của từng công ty thành viên
  let curCol = 7;
  matrixCompanies.forEach((compName) => {
    sheet1.mergeCells(4, curCol, 4, curCol + 2);
    sheet1.getCell(4, curCol).value = compName.toUpperCase();
    sheet1.getCell(5, curCol).value = 'Đã Mua';
    sheet1.getCell(5, curCol + 1).value = 'Đang Dùng';
    sheet1.getCell(5, curCol + 2).value = 'Cân Đối';
    curCol += 3;
  });

  // Cột Cuối: Tổng Chi Phí
  sheet1.mergeCells(4, curCol, 5, curCol);
  sheet1.getCell(4, curCol).value = `TỔNG CHI PHÍ (${selectedCurrency})`;

  // Format Tier 1 & 2 Headers
  for (let c = 1; c <= curCol; c++) {
    const c4 = sheet1.getCell(4, c);
    const c5 = sheet1.getCell(5, c);
    [c4, c5].forEach((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } }; // Purple 700
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF94A3B8' } },
        bottom: { style: 'medium', color: { argb: 'FF3B0764' } },
        left: { style: 'thin', color: { argb: 'FF94A3B8' } },
        right: { style: 'thin', color: { argb: 'FF94A3B8' } },
      };
    });
  }

  // Highlight POOL CHUNG header with slightly darker color
  for (let c = 4; c <= 6; c++) {
    sheet1.getCell(4, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } };
    sheet1.getCell(5, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } };
  }

  // Data Rows Sheet 1
  let dataRowIdx = 6;
  groupedLicenses.forEach((group, gIdx) => {
    const r = sheet1.getRow(dataRowIdx);
    r.height = 22;

    // Col 1: STT
    r.getCell(1).value = gIdx + 1;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col 2: Name
    r.getCell(2).value = group.name;
    r.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    r.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };

    // Col 3: Type
    r.getCell(3).value = group.licenseType;
    r.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col 4: Pool Total
    r.getCell(4).value = group.totalSeats;
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).font = { name: 'Arial', size: 10, bold: true };

    // Col 5: Pool Used
    r.getCell(5).value = group.usedSeats;
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };

    // Col 6: Pool Balance
    const poolRem = group.remainingSeats;
    r.getCell(6).value = poolRem > 0 ? `+${poolRem} (Dư)` : poolRem === 0 ? '0 (Vừa đủ)' : `-${Math.abs(poolRem)} (Thiếu)`;
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(6).font = {
      name: 'Arial',
      size: 9.5,
      bold: true,
      color: { argb: poolRem > 0 ? 'FF15803D' : poolRem < 0 ? 'FFB91C1C' : 'FF475569' },
    };
    if (poolRem > 0) {
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light Green
    } else if (poolRem < 0) {
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Light Red
    }

    // Companies columns
    let colPointer = 7;
    matrixCompanies.forEach((comp) => {
      const stat = (group.companyStats || []).find((cs) => cs.companyName === comp);
      const pCell = r.getCell(colPointer);
      const uCell = r.getCell(colPointer + 1);
      const bCell = r.getCell(colPointer + 2);

      pCell.alignment = { vertical: 'middle', horizontal: 'center' };
      uCell.alignment = { vertical: 'middle', horizontal: 'center' };
      bCell.alignment = { vertical: 'middle', horizontal: 'center' };

      if (!stat) {
        pCell.value = 0;
        uCell.value = 0;
        bCell.value = '—';
        bCell.font = { name: 'Arial', size: 9, color: { argb: 'FF94A3B8' } };
      } else {
        pCell.value = stat.purchasedSeats;
        pCell.font = { name: 'Arial', size: 9.5, bold: stat.purchasedSeats > 0 };

        uCell.value = stat.usedSeats;
        uCell.font = { name: 'Arial', size: 9.5, bold: stat.usedSeats > 0 };

        if (stat.status === 'DEFICIT') {
          bCell.value = `-${Math.abs(stat.balanceSeats)} (Thiếu)`;
          bCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
          bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
        } else if (stat.status === 'BORROWED') {
          bCell.value = `Mượn ${stat.usedSeats}`;
          bCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
          bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
        } else if (stat.status === 'SURPLUS') {
          bCell.value = `+${stat.balanceSeats} (Dư)`;
          bCell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
          bCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
        } else {
          bCell.value = '0 (Vừa đủ)';
          bCell.font = { name: 'Arial', size: 9, color: { argb: 'FF64748B' } };
        }
      }

      colPointer += 3;
    });

    // Final Col: Cost
    const costCell = r.getCell(colPointer);
    costCell.value = Math.round(group.totalCostInSelectedCurrency);
    costCell.numFmt = selectedCurrency === 'VND' ? '#,##0" ₫"' : selectedCurrency === 'USD' ? '"$"#,##0.00' : '#,##0.00';
    costCell.alignment = { vertical: 'middle', horizontal: 'right' };
    costCell.font = { name: 'Arial', size: 10, bold: true };

    // Thin borders for data cells
    for (let c = 1; c <= colPointer; c++) {
      r.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }

    dataRowIdx++;
  });

  // Summary Total Row (Sheet 1)
  const totalRow = sheet1.getRow(dataRowIdx);
  totalRow.height = 26;
  totalRow.getCell(1).value = 'TỔNG CỘNG';
  totalRow.getCell(2).value = `${groupedLicenses.length} gói bản quyền tập đoàn`;
  totalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E1B4B' } };
  totalRow.getCell(2).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E1B4B' } };

  // Sum Pool Total
  const poolTotalSeats = groupedLicenses.reduce((acc, g) => acc + (g.totalSeats || 0), 0);
  const poolTotalUsed = groupedLicenses.reduce((acc, g) => acc + (g.usedSeats || 0), 0);
  const poolTotalBal = poolTotalSeats - poolTotalUsed;
  totalRow.getCell(4).value = poolTotalSeats;
  totalRow.getCell(5).value = poolTotalUsed;
  totalRow.getCell(6).value = poolTotalBal >= 0 ? `+${poolTotalBal} (Dư)` : `-${Math.abs(poolTotalBal)} (Thiếu)`;
  totalRow.getCell(4).font = { name: 'Arial', size: 10.5, bold: true };
  totalRow.getCell(5).font = { name: 'Arial', size: 10.5, bold: true };
  totalRow.getCell(6).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: poolTotalBal >= 0 ? 'FF15803D' : 'FFB91C1C' } };

  // Sum Each Company
  let cPointer = 7;
  matrixCompanies.forEach((comp) => {
    let cPurchased = 0;
    let cUsed = 0;
    groupedLicenses.forEach((g) => {
      const s = (g.companyStats || []).find((cs) => cs.companyName === comp);
      if (s) {
        cPurchased += s.purchasedSeats;
        cUsed += s.usedSeats;
      }
    });
    const cBal = cPurchased - cUsed;
    totalRow.getCell(cPointer).value = cPurchased;
    totalRow.getCell(cPointer + 1).value = cUsed;
    totalRow.getCell(cPointer + 2).value = cBal > 0 ? `+${cBal} (Dư)` : cBal < 0 ? `-${Math.abs(cBal)} (Thiếu)` : '0';

    totalRow.getCell(cPointer).font = { name: 'Arial', size: 10, bold: true };
    totalRow.getCell(cPointer + 1).font = { name: 'Arial', size: 10, bold: true };
    totalRow.getCell(cPointer + 2).font = {
      name: 'Arial',
      size: 10,
      bold: true,
      color: { argb: cBal > 0 ? 'FF15803D' : cBal < 0 ? 'FFB91C1C' : 'FF475569' },
    };

    cPointer += 3;
  });

  // Total Investment Cost
  const totalCost = groupedLicenses.reduce((acc, g) => acc + (g.totalCostInSelectedCurrency || 0), 0);
  totalRow.getCell(cPointer).value = Math.round(totalCost);
  totalRow.getCell(cPointer).numFmt = selectedCurrency === 'VND' ? '#,##0" ₫"' : selectedCurrency === 'USD' ? '"$"#,##0.00' : '#,##0.00';
  totalRow.getCell(cPointer).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF581C87' } };

  for (let c = 1; c <= cPointer; c++) {
    totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    totalRow.getCell(c).border = {
      top: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    };
  }

  // Adjust Columns width Sheet 1
  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(2).width = 34;
  sheet1.getColumn(3).width = 16;
  sheet1.getColumn(4).width = 12;
  sheet1.getColumn(5).width = 12;
  sheet1.getColumn(6).width = 18;
  for (let c = 7; c < cPointer; c += 3) {
    sheet1.getColumn(c).width = 12;
    sheet1.getColumn(c + 1).width = 12;
    sheet1.getColumn(c + 2).width = 16;
  }
  sheet1.getColumn(cPointer).width = 22;


  // ==========================================
  // SHEET 2: CHI TIẾT CÁC ĐỢT MUA (PURCHASE BATCHES)
  // ==========================================
  const sheet2 = workbook.addWorksheet('2. Chi Tiết Các Đợt Mua', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:O1');
  const title2 = sheet2.getCell('A1');
  title2.value = 'DANH SÁCH CHI TIẾT CÁC ĐỢT MUA BẢN QUYỀN THEO CÔNG TY & HỢP ĐỒNG';
  title2.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  title2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(1).height = 34;

  const s2Headers = [
    'STT',
    'Tên Phần Mềm / Bản Quyền',
    'Công Ty Đứng Tên Mua',
    'Đợt Mua',
    'Số Hợp Đồng',
    'Số Hóa Đơn VAT',
    'Nhà Cung Cấp',
    'License Key / Serial',
    'Số Ghế Mua',
    'Đang Dùng',
    'Còn Trống',
    'Ngày Mua',
    'Ngày Hết Hạn',
    'Trạng Thái Hạn',
    `Chi Phí Đợt (${selectedCurrency})`,
  ];

  const headerRow2 = sheet2.addRow(s2Headers);
  headerRow2.height = 25;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4338CA' } }; // Indigo 700
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } } };
  });

  let s2Index = 1;
  groupedLicenses.forEach((group) => {
    (group.batches || []).forEach((b: any, bIdx: number) => {
      const bUsed = b.usedSeats !== undefined && b.usedSeats !== null ? b.usedSeats : (b.assignments?.filter((a: any) => !a.revokedAt)?.length || 0);
      const bTotal = b.totalSeats || 1;
      const bRem = Math.max(0, bTotal - bUsed);

      const bPrice = Number(b.purchasePrice) || 0;
      const bCur = b.purchaseCurrency || 'VND';
      const bCost = (group.companyStats.flatMap((cs) => cs.batches).find((item) => item.batchId === b.id)?.costInSelectedCurrency) || bPrice;

      const isExp = b.expiryDate && new Date(b.expiryDate) < new Date();
      const isExpSoon = b.expiryDate && !isExp && new Date(b.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const r2 = sheet2.addRow([
        s2Index++,
        group.name,
        b.companyName || 'Toàn tập đoàn / Chung',
        `Đợt ${bIdx + 1}`,
        b.contractNumber || '—',
        b.invoiceNumber || '—',
        b.vendor?.name || '—',
        b.licenseKey || '—',
        bTotal,
        bUsed,
        bRem,
        b.purchaseDate ? formatDate(b.purchaseDate) : '—',
        b.expiryDate ? formatDate(b.expiryDate) : 'Vô hạn',
        isExp ? 'Đã hết hạn' : isExpSoon ? 'Sắp hết hạn (<30d)' : b.expiryDate ? 'Còn hạn' : 'Vô hạn',
        Math.round(bCost),
      ]);

      r2.height = 20;
      r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(12).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };
      r2.getCell(15).alignment = { vertical: 'middle', horizontal: 'right' };
      r2.getCell(15).numFmt = selectedCurrency === 'VND' ? '#,##0" ₫"' : selectedCurrency === 'USD' ? '"$"#,##0.00' : '#,##0.00';

      if (isExp) {
        r2.getCell(14).font = { color: { argb: 'FFDC2626' }, bold: true };
      } else if (isExpSoon) {
        r2.getCell(14).font = { color: { argb: 'FFD97706' }, bold: true };
      }
    });
  });

  // Adjust Sheet 2 width
  sheet2.getColumn(1).width = 6;
  sheet2.getColumn(2).width = 30;
  sheet2.getColumn(3).width = 32;
  sheet2.getColumn(4).width = 10;
  sheet2.getColumn(5).width = 20;
  sheet2.getColumn(6).width = 16;
  sheet2.getColumn(7).width = 20;
  sheet2.getColumn(8).width = 26;
  sheet2.getColumn(9).width = 12;
  sheet2.getColumn(10).width = 12;
  sheet2.getColumn(11).width = 12;
  sheet2.getColumn(12).width = 14;
  sheet2.getColumn(13).width = 14;
  sheet2.getColumn(14).width = 16;
  sheet2.getColumn(15).width = 20;


  // ==========================================
  // SHEET 3: DANH SÁCH GÁN NGƯỜI DÙNG (ALLOCATIONS)
  // ==========================================
  const sheet3 = workbook.addWorksheet('3. Danh Sách Gán Người Dùng', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:J1');
  const title3 = sheet3.getCell('A1');
  title3.value = 'DANH SÁCH NHÂN SỰ & THIẾT BỊ ĐƯỢC GÁN BẢN QUYỀN (AUDIT & COMPLIANCE)';
  title3.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  title3.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet3.getRow(1).height = 34;

  const s3Headers = [
    'STT',
    'Tên Phần Mềm / Bản Quyền',
    'Đợt Mua Cấp Phát',
    'Công Ty Của Nhân Sự',
    'Họ Và Tên Nhân Viên',
    'Email Công Vụ',
    'Phòng Ban / Bộ Phận',
    'Mã Thiết Bị / Máy Tính',
    'Tên Thiết Bị',
    'Ngày Cấp Phát',
  ];

  const headerRow3 = sheet3.addRow(s3Headers);
  headerRow3.height = 25;
  headerRow3.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }; // Slate 700
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF0F172A' } } };
  });

  let s3Index = 1;
  groupedLicenses.forEach((group) => {
    (group.allAssignments || []).forEach((a: any) => {
      const uComp = a.user?.companyName || a.asset?.companyName || 'Toàn tập đoàn / Chung';
      const r3 = sheet3.addRow([
        s3Index++,
        group.name,
        `Đợt ${a.batchNumber || 1}`,
        uComp,
        a.user?.fullName || '—',
        a.user?.email || '—',
        a.user?.department || '—',
        a.asset?.assetTag || '—',
        a.asset?.name || '—',
        a.assignedAt ? formatDate(a.assignedAt) : '—',
      ]);

      r3.height = 20;
      r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
      r3.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      r3.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
    });
  });

  // Adjust Sheet 3 width
  sheet3.getColumn(1).width = 6;
  sheet3.getColumn(2).width = 30;
  sheet3.getColumn(3).width = 14;
  sheet3.getColumn(4).width = 32;
  sheet3.getColumn(5).width = 24;
  sheet3.getColumn(6).width = 26;
  sheet3.getColumn(7).width = 22;
  sheet3.getColumn(8).width = 16;
  sheet3.getColumn(9).width = 22;
  sheet3.getColumn(10).width = 14;

  // Generate and Download File in Browser
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const compSlug = selectedCompany ? `_${selectedCompany.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}` : '_Toan_Tap_Doan';
  link.download = `Bao_Cao_Ma_Tran_Ban_Quyen_SAM${compSlug}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Xuất riêng 1 gói bản quyền cụ thể ra Excel (Single License Deep-Dive)
 */
export async function exportSingleLicenseExcel(
  group: LicenseGroup,
  selectedCurrency: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Simply IT [Enterprise Edition]';
  workbook.created = new Date();

  // SHEET 1: CÂN ĐỐI CÁC CÔNG TY
  const sheet1 = workbook.addWorksheet('Cân Đối Các Công Ty', {
    views: [{ showGridLines: true }],
  });

  sheet1.mergeCells('A1:G1');
  const title = sheet1.getCell('A1');
  title.value = `BÁO CÁO PHÂN BỔ BẢN QUYỀN: ${group.name.toUpperCase()}`;
  title.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF581C87' } };
  title.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(1).height = 32;

  const headers1 = [
    'STT',
    'Công Ty Thành Viên',
    'Đợt Mua Sở Hữu',
    'Đã Mua (Seats)',
    'Đang Dùng (Seats)',
    'Tình Trạng Cân Đối',
    `Chi Phí Đợt (${selectedCurrency})`,
  ];
  const hRow1 = sheet1.addRow(headers1);
  hRow1.height = 24;
  hRow1.eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (group.companyStats || []).forEach((cs, idx) => {
    const bStr = cs.batches.map((b) => `Đợt ${b.batchNumber} (${b.seats} seats)`).join(', ') || 'Chưa mua đợt nào';
    const statusText =
      cs.status === 'DEFICIT'
        ? `-${Math.abs(cs.balanceSeats)} (Thiếu)`
        : cs.status === 'BORROWED'
        ? `Mượn ${cs.usedSeats}`
        : cs.status === 'SURPLUS'
        ? `+${cs.balanceSeats} (Dư)`
        : '0 (Vừa đủ)';

    const r = sheet1.addRow([
      idx + 1,
      cs.companyName,
      bStr,
      cs.purchasedSeats,
      cs.usedSeats,
      statusText,
      Math.round(cs.totalCostInSelectedCurrency),
    ]);

    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'right' };
    r.getCell(7).numFmt = selectedCurrency === 'VND' ? '#,##0" ₫"' : '#,##0.00';

    if (cs.status === 'DEFICIT') {
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      r.getCell(6).font = { bold: true, color: { argb: 'FFB91C1C' } };
    } else if (cs.status === 'SURPLUS') {
      r.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      r.getCell(6).font = { bold: true, color: { argb: 'FF15803D' } };
    }
  });

  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(2).width = 34;
  sheet1.getColumn(3).width = 24;
  sheet1.getColumn(4).width = 14;
  sheet1.getColumn(5).width = 14;
  sheet1.getColumn(6).width = 18;
  sheet1.getColumn(7).width = 20;

  // SHEET 2: DANH SÁCH NGƯỜI DÙNG
  const sheet2 = workbook.addWorksheet('Danh Sách Người Dùng', {
    views: [{ showGridLines: true }],
  });
  const headers2 = ['STT', 'Họ Và Tên', 'Email', 'Công Ty', 'Phòng Ban', 'Thiết Bị Cài Đặt', 'Đợt Cấp', 'Ngày Cấp'];
  const hRow2 = sheet2.addRow(headers2);
  hRow2.height = 24;
  hRow2.eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  (group.allAssignments || []).forEach((a: any, idx: number) => {
    const r = sheet2.addRow([
      idx + 1,
      a.user?.fullName || '—',
      a.user?.email || '—',
      a.user?.companyName || a.asset?.companyName || '—',
      a.user?.department || '—',
      a.asset ? `${a.asset.assetTag} (${a.asset.name || ''})` : '—',
      `Đợt ${a.batchNumber || 1}`,
      a.assignedAt ? formatDate(a.assignedAt) : '—',
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
  });

  sheet2.getColumn(1).width = 6;
  sheet2.getColumn(2).width = 24;
  sheet2.getColumn(3).width = 26;
  sheet2.getColumn(4).width = 30;
  sheet2.getColumn(5).width = 22;
  sheet2.getColumn(6).width = 24;
  sheet2.getColumn(7).width = 12;
  sheet2.getColumn(8).width = 14;

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const safeName = group.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 25);
  link.download = `Bao_Cao_Ban_Quyen_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
