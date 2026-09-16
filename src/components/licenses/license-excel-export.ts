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
        b.specs?.batchName || b.specs?.batchLabel || `Đợt ${bIdx + 1}`,
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
 * Xuất riêng 1 gói bản quyền cụ thể ra Excel (Single License Executive Edition - Đúng 2 Sheet tinh gọn)
 * PHƯƠNG ÁN 1 CHUẨN QUỐC TẾ:
 * Sheet 1: 1. Quản Lý & Chi Tiết Đợt Mua
 *   - Khối trên: BẢNG CÂN ĐỐI THEO CÔNG TY (Ai mua, ai dùng, dư/thiếu, tổng chi phí)
 *   - Khối dưới: BẢNG KÊ CHI TIẾT TỪNG ĐỢT MUA HÀNG (Tên đợt tùy chỉnh, Ngày mua, Ngày hết hạn, Đơn giá, Tổng tiền nguyên tệ & quy đổi, HĐ, Hóa đơn VAT)
 * Sheet 2: 2. Danh Sách Gán Người Dùng (Audit Trail nhân sự & thiết bị)
 */
export async function exportSingleLicenseExcel(
  group: LicenseGroup,
  selectedCurrency: string
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Simply IT [Enterprise Edition]';
  workbook.lastModifiedBy = 'Simply IT SAM Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper format loại bản quyền thuần tiếng Việt chuẩn
  const formatLicenseTypeVi = (type: string) => {
    switch (type) {
      case 'SUBSCRIPTION': return 'Thuê bao định kỳ (Subscription)';
      case 'PERPETUAL': return 'Vĩnh viễn (Perpetual)';
      case 'OEM': return 'OEM (Đi kèm thiết bị)';
      case 'TRIAL': return 'Dùng thử (Trial)';
      case 'OPEN_SOURCE': return 'Mã nguồn mở (Open Source)';
      default: return type || '—';
    }
  };

  const currencyFmt = selectedCurrency === 'VND' ? '#,##0" VNĐ"' : selectedCurrency === 'USD' ? '"$"#,##0.00' : '#,##0.00';

  // =========================================================================
  // SHEET 1: QUẢN LÝ TẬP ĐOÀN & CHI TIẾT CÁC ĐỢT MUA
  // =========================================================================
  const sheet1 = workbook.addWorksheet('1. Quản Lý & Chi Tiết Đợt Mua', {
    views: [{ showGridLines: true }],
  });

  // --- 1. BANNER TIÊU ĐỀ CHÍNH ---
  sheet1.mergeCells('A1:P1');
  const title1 = sheet1.getCell('A1');
  title1.value = `BÁO CÁO QUẢN TRỊ & CHI TIẾT BẢN QUYỀN: ${group.name.toUpperCase()}`;
  title1.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B0764' } }; // Deep Royal Purple
  title1.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(1).height = 36;

  sheet1.mergeCells('A2:P2');
  const sub1 = sheet1.getCell('A2');
  const typeText = formatLicenseTypeVi(group.licenseType);
  sub1.value = `Loại bản quyền: ${typeText}  |  Nhà cung cấp: ${group.vendor?.name || '—'}  |  Tổng số lượng: ${group.totalSeats} seats  |  Đang sử dụng: ${group.usedSeats} seats  |  Còn trống: ${Math.max(0, group.totalSeats - group.usedSeats)} seats  |  Thời gian xuất: ${new Date().toLocaleString('vi-VN')}`;
  sub1.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet1.getRow(2).height = 22;

  sheet1.addRow([]); // Dòng 3 trống

  // --- 2. KHỐI I: BẢNG CÂN ĐỐI BẢN QUYỀN CÁC CÔNG TY THÀNH VIÊN ---
  sheet1.mergeCells('A4:I4');
  const sectionATitle = sheet1.getCell('A4');
  sectionATitle.value = 'I. BẢNG CÂN ĐỐI BẢN QUYỀN CÁC CÔNG TY THÀNH VIÊN';
  sectionATitle.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sectionATitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } }; // Purple 700
  sectionATitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet1.getRow(4).height = 26;

  const headersA = [
    'STT',
    'Công Ty Thành Viên',
    'Các Đợt Mua Sở Hữu',
    'Ngày Mua',
    'Hạn Dùng',
    'Đã Mua',
    'Đang Dùng',
    'Chênh Lệch',
    'Tình Trạng',
    '',
    '',
    `Tổng Chi Phí (${selectedCurrency})`,
    '',
    '',
    '',
    '',
  ];
  const hRowA = sheet1.addRow(headersA);
  hRowA.height = 25;

  // Merge header cells cho cột tiền J5:L5
  sheet1.mergeCells('J5:L5');
  sheet1.getCell('J5').value = `Tổng Chi Phí (${selectedCurrency})`;

  for (let c = 1; c <= 9; c++) {
    const cell = hRowA.getCell(c);
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF3B0764' } } };
  }
  const costCellA = sheet1.getCell('J5');
  costCellA.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
  costCellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7E22CE' } };
  costCellA.alignment = { vertical: 'middle', horizontal: 'center' };
  costCellA.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF3B0764' } } };

  (group.companyStats || []).forEach((cs, idx) => {
    const bStr = cs.batches.map((b) => {
      const bTitle = b.batchName || `Đợt ${b.batchNumber}`;
      const dStr = b.purchaseDate ? ` - ${formatDate(b.purchaseDate)}` : '';
      return `${bTitle}${dStr} (${b.seats} seats)`;
    }).join('; ') || 'Chưa mua đợt nào (Dùng pool chung)';

    const dates = cs.batches.map((b) => b.purchaseDate).filter(Boolean);
    const expDates = cs.batches.map((b) => b.expiryDate).filter(Boolean);
    const latestPDate = dates.length > 0 ? formatDate(dates[dates.length - 1]!) : '—';
    const latestEDate = expDates.length > 0 ? formatDate(expDates[0]!) : 'Vô hạn';

    const balText = cs.balanceSeats > 0 ? `+${cs.balanceSeats}` : cs.balanceSeats < 0 ? `-${Math.abs(cs.balanceSeats)}` : '0';
    const statusText =
      cs.status === 'DEFICIT'
        ? `Thiếu ${Math.abs(cs.balanceSeats)} seats`
        : cs.status === 'BORROWED'
        ? `Mượn ${cs.usedSeats} seats`
        : cs.status === 'SURPLUS'
        ? `Dư ${cs.balanceSeats} seats`
        : 'Vừa đủ';

    const r = sheet1.addRow([
      idx + 1,
      cs.companyName,
      bStr,
      latestPDate,
      latestEDate,
      cs.purchasedSeats,
      cs.usedSeats,
      balText,
      statusText,
      Math.round(cs.totalCostInSelectedCurrency),
      '',
      '',
    ]);

    const rowNum = r.number;
    sheet1.mergeCells(`J${rowNum}:L${rowNum}`);
    const costValCell = sheet1.getCell(`J${rowNum}`);
    costValCell.value = Math.round(cs.totalCostInSelectedCurrency);
    costValCell.numFmt = currencyFmt;
    costValCell.alignment = { vertical: 'middle', horizontal: 'right' };
    costValCell.font = { name: 'Arial', size: 9.5, bold: true };

    r.height = 22;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 9; c++) {
      r.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    }
    costValCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };

    if (cs.status === 'DEFICIT') {
      r.getCell(8).font = { bold: true, color: { argb: 'FFB91C1C' } };
      r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      r.getCell(9).font = { bold: true, color: { argb: 'FFB91C1C' } };
    } else if (cs.status === 'SURPLUS') {
      r.getCell(8).font = { bold: true, color: { argb: 'FF15803D' } };
      r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
      r.getCell(9).font = { bold: true, color: { argb: 'FF15803D' } };
    } else if (cs.status === 'BORROWED') {
      r.getCell(8).font = { bold: true, color: { argb: 'FFB45309' } };
      r.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      r.getCell(9).font = { bold: true, color: { argb: 'FFB45309' } };
    }
  });

  // Summary Row Khối I (MERGED A:C to look spacious and clean)
  const totalPurchased = (group.companyStats || []).reduce((acc, cs) => acc + cs.purchasedSeats, 0);
  const totalUsed = (group.companyStats || []).reduce((acc, cs) => acc + cs.usedSeats, 0);
  const netBal = totalPurchased - totalUsed;
  const totalCost = (group.companyStats || []).reduce((acc, cs) => acc + cs.totalCostInSelectedCurrency, 0);

  const sumRowA = sheet1.addRow([
    'TỔNG CỘNG',
    '',
    '',
    '—',
    group.earliestExpiry ? formatDate(group.earliestExpiry) : 'Vô hạn',
    totalPurchased,
    totalUsed,
    netBal >= 0 ? `+${netBal}` : `-${Math.abs(netBal)}`,
    netBal >= 0 ? `Dư ${netBal} seats` : `Thiếu ${Math.abs(netBal)} seats`,
    Math.round(totalCost),
    '',
    '',
  ]);
  const sumARowNum = sumRowA.number;
  sheet1.mergeCells(`A${sumARowNum}:C${sumARowNum}`);
  const sumTitleCellA = sheet1.getCell(`A${sumARowNum}`);
  sumTitleCellA.value = 'TỔNG CỘNG (CÁC ĐƠN VỊ THÀNH VIÊN)';
  sumTitleCellA.alignment = { vertical: 'middle', horizontal: 'center' };
  sumTitleCellA.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF3B0764' } };

  sheet1.mergeCells(`J${sumARowNum}:L${sumARowNum}`);
  const sumCostCellA = sheet1.getCell(`J${sumARowNum}`);
  sumCostCellA.value = Math.round(totalCost);
  sumCostCellA.numFmt = currencyFmt;
  sumCostCellA.alignment = { vertical: 'middle', horizontal: 'right' };
  sumCostCellA.font = { name: 'Arial', size: 10, bold: true };

  sumRowA.height = 25;
  for (let c = 1; c <= 9; c++) {
    const cell = sumRowA.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF64748B' } }, bottom: { style: 'double', color: { argb: 'FF0F172A' } } };
  }
  sumCostCellA.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sumCostCellA.border = { top: { style: 'medium', color: { argb: 'FF64748B' } }, bottom: { style: 'double', color: { argb: 'FF0F172A' } } };
  sumRowA.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(8).font = { bold: true, color: { argb: netBal >= 0 ? 'FF15803D' : 'FFB91C1C' } };
  sumRowA.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowA.getCell(9).font = { bold: true, color: { argb: netBal >= 0 ? 'FF15803D' : 'FFB91C1C' } };


  // --- 3. KHOẢNG NGHỈ CHUYÊN NGHIỆP ---
  sheet1.addRow([]); // Dòng trống 1
  sheet1.addRow([]); // Dòng trống 2


  // --- 4. KHỐI II: BẢNG KÊ CHI TIẾT TỪNG ĐỢT MUA HÀNG & HỢP ĐỒNG ---
  const bBannerRow = sheet1.addRow([]);
  const bBannerNum = bBannerRow.number;
  sheet1.mergeCells(`A${bBannerNum}:P${bBannerNum}`);
  const sectionBTitle = sheet1.getCell(`A${bBannerNum}`);
  sectionBTitle.value = 'II. BẢNG KÊ CHI TIẾT TỪNG ĐỢT MUA HÀNG & HỢP ĐỒNG';
  sectionBTitle.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
  sectionBTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } }; // Deep Navy 950
  sectionBTitle.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  bBannerRow.height = 26;

  const headersB = [
    'STT',
    'Tên Đợt Mua',
    'Công Ty Đứng Tên Mua',
    'Ngày Mua',
    'Hạn Sử Dụng',
    'Số Lượng Mua',
    'Đang Dùng',
    'Còn Trống',
    'Tình Trạng Hạn',
    'Đơn Giá / Ghế',
    'Tổng Tiền Đợt (Nguyên Tệ)',
    `Thành Tiền Quy Đổi (${selectedCurrency})`,
    'Số Hợp Đồng',
    'Số Hóa Đơn VAT',
    'Nhà Cung Cấp',
    'Ghi Chú Đợt Mua',
  ];

  const hRowB = sheet1.addRow(headersB);
  hRowB.height = 25;
  hRowB.eachCell((c) => {
    c.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF312E81' } }; // Indigo 900
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    c.border = { top: { style: 'thin' }, bottom: { style: 'medium', color: { argb: 'FF1E1B4B' } } };
  });

  let bTotalSeatsSum = 0;
  let bTotalUsedSum = 0;
  let bTotalCostSum = 0;

  (group.batches || []).forEach((b: any, bIdx: number) => {
    const bTotal = b.totalSeats || 1;
    const bUsed = b.usedSeats !== undefined && b.usedSeats !== null ? b.usedSeats : (b.assignments?.filter((a: any) => !a.revokedAt)?.length || 0);
    const bRem = Math.max(0, bTotal - bUsed);

    bTotalSeatsSum += bTotal;
    bTotalUsedSum += bUsed;

    const bPrice = Number(b.purchasePrice) || 0;
    const bCur = b.purchaseCurrency || 'VND';
    const unitPrice = bTotal > 0 && bPrice > 0 ? bPrice / bTotal : 0;

    const bCost = (group.companyStats.flatMap((cs) => cs.batches).find((item) => item.batchId === b.id)?.costInSelectedCurrency) || bPrice;
    bTotalCostSum += bCost;

    const isExp = b.expiryDate && new Date(b.expiryDate) < new Date();
    const isExpSoon = b.expiryDate && !isExp && new Date(b.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const customBatchName = b.specs?.batchName || b.specs?.batchLabel || `Đợt ${bIdx + 1}`;

    const rB = sheet1.addRow([
      bIdx + 1,
      customBatchName,
      b.companyName || 'Toàn tập đoàn / Chung',
      b.purchaseDate ? formatDate(b.purchaseDate) : '—',
      b.expiryDate ? formatDate(b.expiryDate) : 'Vô hạn',
      bTotal,
      bUsed,
      bRem,
      isExp ? 'Đã hết hạn' : isExpSoon ? 'Sắp hết (<30d)' : b.expiryDate ? 'Còn hạn' : 'Vô hạn',
      unitPrice > 0 ? Math.round(unitPrice) : '—',
      bPrice > 0 ? (bCur === 'VND' ? `${new Intl.NumberFormat('vi-VN').format(Math.round(bPrice))} VNĐ` : formatPrice(bPrice, bCur)) : '0 VNĐ',
      Math.round(bCost),
      b.contractNumber || '—',
      b.invoiceNumber || '—',
      b.vendor?.name || group.vendor?.name || '—',
      b.notes || '—',
    ]);

    rB.height = 22;
    rB.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(4).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(5).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(10).alignment = { vertical: 'middle', horizontal: 'right' };
    if (unitPrice > 0) rB.getCell(10).numFmt = currencyFmt;
    rB.getCell(11).alignment = { vertical: 'middle', horizontal: 'right' };
    rB.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };
    rB.getCell(12).numFmt = currencyFmt;
    rB.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
    rB.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 16; c++) {
      rB.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (bIdx % 2 === 1) {
        rB.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }

    if (isExp) {
      rB.getCell(9).font = { color: { argb: 'FFDC2626' }, bold: true };
      rB.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
    } else if (isExpSoon) {
      rB.getCell(9).font = { color: { argb: 'FFD97706' }, bold: true };
      rB.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    }
  });

  // Summary Row Khối II (MERGED A:E completely eliminating the cut-off text bug)
  const sumRowB = sheet1.addRow([
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    bTotalSeatsSum,
    bTotalUsedSum,
    Math.max(0, bTotalSeatsSum - bTotalUsedSum),
    '—',
    '—',
    '—',
    Math.round(bTotalCostSum),
    '—',
    '—',
    '—',
    '—',
  ]);
  const bSumRowNum = sumRowB.number;
  sheet1.mergeCells(`A${bSumRowNum}:E${bSumRowNum}`);
  const sumTitleCellB = sheet1.getCell(`A${bSumRowNum}`);
  sumTitleCellB.value = `TỔNG CỘNG (${group.batches?.length || 1} ĐỢT MUA)`;
  sumTitleCellB.alignment = { vertical: 'middle', horizontal: 'center' };
  sumTitleCellB.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E1B4B' } };

  sumRowB.height = 25;
  for (let c = 1; c <= 16; c++) {
    const cell = sumRowB.getCell(c);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    cell.border = { top: { style: 'medium', color: { argb: 'FF64748B' } }, bottom: { style: 'double', color: { argb: 'FF0F172A' } } };
  }
  sumRowB.getCell(6).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(9).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(10).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(11).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(12).alignment = { vertical: 'middle', horizontal: 'right' };
  sumRowB.getCell(12).numFmt = currencyFmt;
  sumRowB.getCell(12).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E1B4B' } };
  sumRowB.getCell(13).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(14).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(15).alignment = { vertical: 'middle', horizontal: 'center' };
  sumRowB.getCell(16).alignment = { vertical: 'middle', horizontal: 'center' };

  // Điều chỉnh độ rộng cột chuẩn rộng rãi, tuyệt đối không bị đè chữ
  sheet1.getColumn(1).width = 6;   // STT
  sheet1.getColumn(2).width = 30;  // Tên đợt mua / Công ty
  sheet1.getColumn(3).width = 32;  // Công ty đứng tên mua / Đợt mua sở hữu
  sheet1.getColumn(4).width = 15;  // Ngày mua
  sheet1.getColumn(5).width = 15;  // Hạn sử dụng
  sheet1.getColumn(6).width = 14;  // Số lượng mua
  sheet1.getColumn(7).width = 14;  // Đang dùng
  sheet1.getColumn(8).width = 14;  // Còn trống / Chênh lệch
  sheet1.getColumn(9).width = 18;  // Tình trạng hạn / Tình trạng cân đối
  sheet1.getColumn(10).width = 18; // Đơn giá / Ghế
  sheet1.getColumn(11).width = 24; // Tổng tiền đợt (Nguyên tệ)
  sheet1.getColumn(12).width = 24; // Thành tiền quy đổi (VNĐ)
  sheet1.getColumn(13).width = 22; // Số hợp đồng
  sheet1.getColumn(14).width = 18; // Số hóa đơn VAT
  sheet1.getColumn(15).width = 28; // Nhà cung cấp
  sheet1.getColumn(16).width = 30; // Ghi chú đợt mua


  // =========================================================================
  // SHEET 2: DANH SÁCH NHÂN SỰ & THIẾT BỊ GÁN SỬ DỤNG (AUDIT TRAIL)
  // =========================================================================
  const sheet2 = workbook.addWorksheet('2. Danh Sách Gán Người Dùng', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:I1');
  const title2 = sheet2.getCell('A1');
  title2.value = `DANH SÁCH NHÂN SỰ & THIẾT BỊ SỬ DỤNG BẢN QUYỀN: ${group.name.toUpperCase()}`;
  title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
  title2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(1).height = 34;

  sheet2.mergeCells('A2:I2');
  const sub2 = sheet2.getCell('A2');
  sub2.value = `Tổng số ghế đã cấp phát: ${group.allAssignments?.length || 0} seats  |  Phục vụ đối soát nội bộ và kiểm toán bản quyền phần mềm`;
  sub2.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet2.getRow(2).height = 22;

  sheet2.addRow([]);

  const headers2 = [
    'STT',
    'Họ Và Tên Nhân Sự',
    'Email Công Ty',
    'Công Ty Thành Viên',
    'Phòng Ban',
    'Thiết Bị Cài Đặt (Asset Tag)',
    'Thuộc Đợt Mua Cấp Phát',
    'Ngày Cấp Phát',
    'Ghi Chú Phân Bổ',
  ];
  const hRow2 = sheet2.addRow(headers2);
  hRow2.height = 25;
  hRow2.eachCell((c) => {
    c.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });

  (group.allAssignments || []).forEach((a: any, idx: number) => {
    const batchNameText = a.batchName || `Đợt ${a.batchNumber || 1}`;
    const r = sheet2.addRow([
      idx + 1,
      a.user?.fullName || '—',
      a.user?.email || '—',
      a.user?.companyName || a.asset?.companyName || '—',
      a.user?.department || '—',
      a.asset ? `${a.asset.assetTag} (${a.asset.name || ''})` : '—',
      batchNameText,
      a.assignedAt ? formatDate(a.assignedAt) : '—',
      a.notes || '—',
    ]);
    r.height = 20;
    r.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };
    r.getCell(8).alignment = { vertical: 'middle', horizontal: 'center' };

    for (let c = 1; c <= 9; c++) {
      r.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (idx % 2 === 1) {
        r.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
    }
  });

  sheet2.getColumn(1).width = 6;
  sheet2.getColumn(2).width = 26;
  sheet2.getColumn(3).width = 28;
  sheet2.getColumn(4).width = 32;
  sheet2.getColumn(5).width = 22;
  sheet2.getColumn(6).width = 28;
  sheet2.getColumn(7).width = 26;
  sheet2.getColumn(8).width = 16;
  sheet2.getColumn(9).width = 28;

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
