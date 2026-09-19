import ExcelJS from 'exceljs';
import { prisma } from '@/lib/db';
import { ImportType, ImportBatchStatus, ImportRecordStatus, AssetStatus, AssetCondition, LicenseType, LicenseStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';

// ==================== INTERFACES ====================

export interface RowValidationError {
  rowNumber: number;
  field: string;
  message: string;
  value?: unknown;
}

export interface ImportResultSummary {
  batchId: string;
  fileName: string;
  importType: ImportType;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: RowValidationError[];
  status: ImportBatchStatus;
}

export interface AssetRowData {
  assetTag: string;
  name: string;
  categoryName: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status?: string;
  condition?: string;
  purchaseDate?: Date | string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  warrantyExpiry?: Date | string;
  vendorName?: string;
  locationName?: string;
  companyName?: string;
  userEmail?: string;
  notes?: string;
}

export interface LicenseRowData {
  name: string;
  licenseKey?: string;
  licenseType?: string;
  totalSeats?: number;
  purchaseDate?: Date | string;
  expiryDate?: Date | string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  vendorName?: string;
  companyName?: string;
  userEmail?: string;
  notes?: string;
}

// ==================== TEMPLATE GENERATORS ====================

export async function generateAssetTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh sách Tài sản');

  // Define columns
  worksheet.columns = [
    { header: 'Mã tài sản (*)', key: 'assetTag', width: 18 },
    { header: 'Tên thiết bị (*)', key: 'name', width: 28 },
    { header: 'Danh mục (*)', key: 'categoryName', width: 20 },
    { header: 'Thương hiệu', key: 'brand', width: 16 },
    { header: 'Model', key: 'model', width: 18 },
    { header: 'Số Serial', key: 'serialNumber', width: 20 },
    { header: 'Trạng thái', key: 'status', width: 18 },
    { header: 'Tình trạng', key: 'condition', width: 16 },
    { header: 'Ngày mua (YYYY-MM-DD)', key: 'purchaseDate', width: 22 },
    { header: 'Giá mua (VND)', key: 'purchasePrice', width: 18 },
    { header: 'Hạn bảo hành (YYYY-MM-DD)', key: 'warrantyExpiry', width: 25 },
    { header: 'Nhà cung cấp', key: 'vendorName', width: 24 },
    { header: 'Vị trí đặt', key: 'locationName', width: 20 },
    { header: 'Công Ty Quản Lý', key: 'companyName', width: 28 },
    { header: 'Người sử dụng (Email)', key: 'userEmail', width: 28 },
    { header: 'Ghi chú', key: 'notes', width: 30 },
  ];

  // Header styling
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' }, // Blue
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Sample data row
  worksheet.addRow({
    assetTag: 'IT-LAP-001',
    name: 'Dell Latitude 5540',
    categoryName: 'Laptop',
    brand: 'Dell',
    model: 'Latitude 5540',
    serialNumber: 'SN-DELL-99881',
    status: 'IN_USE',
    condition: 'NEW',
    purchaseDate: '2024-01-15',
    purchasePrice: 24500000,
    warrantyExpiry: '2027-01-15',
    vendorName: 'Phong Vũ',
    locationName: 'Phòng IT',
    companyName: 'Công ty Cổ phần Tập đoàn GELEX',
    userEmail: 'an.nguyen@company.com',
    notes: 'Máy cấp phát cho phòng kỹ thuật',
  });

  worksheet.addRow({
    assetTag: 'IT-MON-002',
    name: 'Màn hình Dell UltraSharp 27"',
    categoryName: 'Màn hình',
    brand: 'Dell',
    model: 'U2723QE',
    serialNumber: 'SN-MON-11223',
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: '2024-02-10',
    purchasePrice: 11000000,
    warrantyExpiry: '2027-02-10',
    vendorName: 'An Phát',
    locationName: 'Phòng Thiết kế',
    companyName: 'Công ty Cổ phần Dây Cáp Điện Việt Nam',
    userEmail: '',
    notes: '',
  });

  // Instruction sheet
  const instructionSheet = workbook.addWorksheet('Hướng dẫn nhập');
  instructionSheet.columns = [
    { header: 'Cột', key: 'col', width: 25 },
    { header: 'Quy tắc & Giá trị cho phép', key: 'rule', width: 65 },
  ];
  const instHeader = instructionSheet.getRow(1);
  instHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  instHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };

  instructionSheet.addRows([
    { col: 'Mã tài sản (*)', rule: 'Bắt buộc, không được trùng lặp với hệ thống và trong file.' },
    { col: 'Tên thiết bị (*)', rule: 'Bắt buộc.' },
    { col: 'Danh mục (*)', rule: 'Bắt buộc. Tên danh mục (Ví dụ: Laptop, Màn hình, Thiết bị mạng, Phụ kiện...)' },
    { col: 'Trạng thái', rule: 'AVAILABLE (Sẵn sàng), IN_USE (Đang dùng), MAINTENANCE (Bảo trì), RETIRED (Thanh lý), LOST (Mất). Mặc định: AVAILABLE' },
    { col: 'Tình trạng', rule: 'NEW (Mới), GOOD (Tốt), FAIR (Trung bình), POOR (Kém), BROKEN (Hỏng). Mặc định: NEW' },
    { col: 'Công Ty Quản Lý', rule: 'Tùy chọn. Tên công ty/pháp nhân quản lý tài sản trong tập đoàn. Tự động đồng bộ vào danh sách công ty nếu là tên mới.' },
    { col: 'Người sử dụng (Email)', rule: 'Tùy chọn. Nhập email nhân sự để tự động gán máy. Nếu bỏ trống hoặc email chưa có trên hệ thống, thiết bị vẫn được import bình thường mà không báo lỗi.' },
    { col: 'Định dạng ngày', rule: 'Định dạng chuẩn: YYYY-MM-DD hoặc DD/MM/YYYY (Ví dụ: 2024-03-15).' },
  ]);

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

export async function generateLicenseTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh sách License');

  worksheet.columns = [
    { header: 'Tên phần mềm (*)', key: 'name', width: 28 },
    { header: 'License Key', key: 'licenseKey', width: 30 },
    { header: 'Loại License', key: 'licenseType', width: 20 },
    { header: 'Số lượng Seats (*)', key: 'totalSeats', width: 18 },
    { header: 'Ngày mua (YYYY-MM-DD)', key: 'purchaseDate', width: 22 },
    { header: 'Ngày hết hạn (YYYY-MM-DD)', key: 'expiryDate', width: 25 },
    { header: 'Giá mua (VND)', key: 'purchasePrice', width: 18 },
    { header: 'Nhà cung cấp', key: 'vendorName', width: 24 },
    { header: 'Công Ty Quản Lý', key: 'companyName', width: 28 },
    { header: 'Người sử dụng (Email)', key: 'userEmail', width: 28 },
    { header: 'Ghi chú', key: 'notes', width: 30 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0D9488' }, // Teal
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  worksheet.addRow({
    name: 'Microsoft 365 Business Standard',
    licenseKey: 'XXXXX-XXXXX-XXXXX-XXXXX',
    licenseType: 'SUBSCRIPTION',
    totalSeats: 25,
    purchaseDate: '2024-01-01',
    expiryDate: '2025-01-01',
    purchasePrice: 65000000,
    vendorName: 'FPT Smart Cloud',
    companyName: 'Công ty Cổ phần Tập đoàn GELEX',
    userEmail: 'an.nguyen@company.com',
    notes: 'Gói bản quyền năm cho toàn công ty',
  });

  worksheet.addRow({
    name: 'Adobe Creative Cloud All Apps',
    licenseKey: 'ADOBE-CC-2024-TEAM',
    licenseType: 'SUBSCRIPTION',
    totalSeats: 5,
    purchaseDate: '2024-03-01',
    expiryDate: '2025-03-01',
    purchasePrice: 38000000,
    vendorName: 'Adobe Direct',
    companyName: 'Công ty Cổ phần Dây Cáp Điện Việt Nam',
    userEmail: '',
    notes: 'Cấp phát cho Team Design & Marketing',
  });

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

export async function generateUserTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Danh Sách Nhân Sự');

  worksheet.mergeCells('A1:L1');
  const titleCell = worksheet.getCell('A1');
  titleCell.value = 'MẪU IMPORT DANH SÁCH NHÂN SỰ & NGƯỜI DÙNG HỆ THỐNG';
  titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6366F1' },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  worksheet.mergeCells('A2:L2');
  const subCell = worksheet.getCell('A2');
  subCell.value = 'Lưu ý: Các cột có dấu (*) là bắt buộc. Mật khẩu nếu để trống hệ thống sẽ tự đặt mặc định là Staff@123. Vai trò: Staff / IT Support / Admin.';
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]);

  const headers = [
    'STT',
    'Họ Và Tên (*)',
    'Email Đăng Nhập (*)',
    'Công Ty Quản Lý',
    'Khối / Phòng Ban',
    'Chức Danh / Vị Trí',
    'Số Điện Thoại',
    'Khu Vực / Cơ Sở Làm Việc',
    'Email Quản Lý Trực Tiếp',
    'Vai Trò (Staff/IT/Admin)',
    'Trạng Thái (Đang làm việc/Nghỉ việc)',
    'Mật Khẩu Khởi Tạo',
  ];

  const headerRow = worksheet.addRow(headers);
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  const sampleRows = [
    [1, 'Nguyễn Văn An', 'an.nguyen@company.com', 'CÔNG TY CỔ PHẦN HÀ YẾN', 'Ban Công Nghệ Thông Tin (IT)', 'Chuyên viên Quản trị Hệ thống', '0987112233', 'Trụ sở Hà Nội', 'admin@company.com', 'Staff', 'Đang làm việc', 'Staff@123'],
    [2, 'Trần Thị Bình', 'binh.tran@company.com', 'CÔNG TY CỔ PHẦN HÀ YẾN', 'Khối Nhân Sự & Hành Chính', 'Chuyên viên Tuyển dụng', '0912345678', 'Trụ sở Hà Nội', 'an.nguyen@company.com', 'Staff', 'Đang làm việc', 'Staff@123'],
    [3, 'Lê Hoàng Cường', 'cuong.le@company.com', 'CÔNG TY TNHH HÀ YẾN IND', 'Khối Kinh Doanh & Thị Trường', 'Trưởng phòng Kinh doanh', '0903456789', 'Văn phòng TP.HCM', '', 'Staff', 'Đang làm việc', 'Staff@123'],
    [4, 'Phạm Minh Đức', 'duc.pham@company.com', 'CÔNG TY CỔ PHẦN TÂN HÀ PHÁT CÔNG NGHIỆP', 'Khối Vận Hành & Sản Xuất', 'Kỹ sư Vận hành', '0978654321', 'Nhà máy Hưng Yên', '', 'Staff', 'Đang làm việc', 'Staff@123'],
  ];

  sampleRows.forEach((row) => {
    const addedRow = worksheet.addRow(row);
    addedRow.height = 22;
    addedRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10 };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'center' : colNumber === 7 ? 'center' : 'left',
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  worksheet.columns = [
    { width: 8 },  // STT
    { width: 26 }, // Họ Và Tên
    { width: 30 }, // Email
    { width: 35 }, // Công Ty
    { width: 32 }, // Phòng Ban
    { width: 30 }, // Chức Danh
    { width: 18 }, // Số Điện Thoại
    { width: 26 }, // Khu Vực / Cơ Sở
    { width: 28 }, // Email Quản Lý
    { width: 24 }, // Vai Trò
    { width: 26 }, // Trạng Thái
    { width: 20 }, // Mật Khẩu
  ];

  const uint8Array = await workbook.xlsx.writeBuffer();
  return Buffer.from(uint8Array);
}

// ==================== EXCEL PARSER & IMPORTER ====================

/**
 * Parse and import assets from Excel buffer
 */
export async function importAssetsFromExcel(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<ImportResultSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có sheet nào.');
  }

  // Create Batch record
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      importType: 'ASSET',
      status: 'PROCESSING',
      importedById: userId,
    },
  });

  const rowsData: { rowNumber: number; data: AssetRowData }[] = [];
  const errors: RowValidationError[] = [];
  const seenTags = new Set<string>();
  const seenSerials = new Set<string>();

  const headerRow = worksheet.getRow(1);
  const colMap = detectAssetColumns(headerRow);

  // 1. Parse Excel rows (skip header row 1)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const assetTag = getCellValue(row.getCell(colMap.assetTag))?.trim();
    const name = getCellValue(row.getCell(colMap.name))?.trim();
    const categoryName = getCellValue(row.getCell(colMap.categoryName))?.trim();
    const brand = colMap.brand ? getCellValue(row.getCell(colMap.brand))?.trim() : undefined;
    const model = colMap.model ? getCellValue(row.getCell(colMap.model))?.trim() : undefined;
    const serialNumber = colMap.serialNumber ? getCellValue(row.getCell(colMap.serialNumber))?.trim() : undefined;
    const status = colMap.status ? getCellValue(row.getCell(colMap.status))?.trim() : undefined;
    const condition = colMap.condition ? getCellValue(row.getCell(colMap.condition))?.trim() : undefined;
    const purchaseDate = colMap.purchaseDate ? parseDateValue(row.getCell(colMap.purchaseDate).value) : undefined;
    const purchasePrice = colMap.purchasePrice ? parseNumberValue(row.getCell(colMap.purchasePrice).value) : undefined;
    const warrantyExpiry = colMap.warrantyExpiry ? parseDateValue(row.getCell(colMap.warrantyExpiry).value) : undefined;
    const vendorName = colMap.vendorName ? getCellValue(row.getCell(colMap.vendorName))?.trim() : undefined;
    const locationName = colMap.locationName ? getCellValue(row.getCell(colMap.locationName))?.trim() : undefined;
    const companyName = colMap.companyName ? getCellValue(row.getCell(colMap.companyName))?.trim() : undefined;
    const userEmail = colMap.userEmail ? getCellValue(row.getCell(colMap.userEmail))?.trim() : undefined;
    const notes = colMap.notes ? getCellValue(row.getCell(colMap.notes))?.trim() : undefined;

    // Skip totally empty rows
    if (!assetTag && !name && !categoryName) return;

    // In-file validation
    if (!assetTag) {
      errors.push({ rowNumber, field: 'assetTag', message: 'Mã tài sản không được để trống' });
    } else if (seenTags.has(assetTag)) {
      errors.push({ rowNumber, field: 'assetTag', message: `Mã tài sản '${assetTag}' bị trùng trong file` });
    } else {
      seenTags.add(assetTag);
    }

    if (!name) {
      errors.push({ rowNumber, field: 'name', message: 'Tên thiết bị không được để trống' });
    }

    if (!categoryName) {
      errors.push({ rowNumber, field: 'categoryName', message: 'Danh mục không được để trống' });
    }

    if (serialNumber) {
      if (seenSerials.has(serialNumber)) {
        errors.push({ rowNumber, field: 'serialNumber', message: `Số Serial '${serialNumber}' bị trùng trong file` });
      } else {
        seenSerials.add(serialNumber);
      }
    }

    rowsData.push({
      rowNumber,
      data: {
        assetTag: assetTag || '',
        name: name || '',
        categoryName: categoryName || '',
        brand,
        model,
        serialNumber,
        status,
        condition,
        purchaseDate,
        purchasePrice,
        warrantyExpiry,
        vendorName,
        locationName,
        companyName,
        userEmail,
        notes,
      },
    });
  });

  const totalRows = rowsData.length;
  let successRows = 0;
  let failedRows = 0;

  // 2. Pre-fetch DB records to check duplicates and resolve references
  const existingTags = new Set(
    (await prisma.asset.findMany({ select: { assetTag: true } })).map((a) => a.assetTag)
  );
  const existingSerials = new Set(
    (await prisma.asset.findMany({ where: { serialNumber: { not: null } }, select: { serialNumber: true } }))
      .map((a) => a.serialNumber as string)
  );

  const usersByEmail = new Map<string, { id: string; email: string; fullName: string }>();
  (await prisma.user.findMany({ select: { id: true, email: true, fullName: true } })).forEach((u) => {
    usersByEmail.set(u.email.toLowerCase().trim(), u);
  });

  const categoriesMap = new Map<string, string>();
  (await prisma.assetCategory.findMany({ select: { id: true, name: true } })).forEach((c) =>
    categoriesMap.set(c.name.toLowerCase(), c.id)
  );

  const vendorsMap = new Map<string, string>();
  (await prisma.vendor.findMany({ select: { id: true, name: true } })).forEach((v) =>
    vendorsMap.set(v.name.toLowerCase(), v.id)
  );

  const locationsMap = new Map<string, string>();
  (await prisma.location.findMany({ select: { id: true, name: true } })).forEach((l) =>
    locationsMap.set(l.name.toLowerCase(), l.id)
  );

  // 3. Process each row
  const newCompanies = new Set<string>();

  for (const item of rowsData) {
    const { rowNumber, data } = item;
    const rowErrors: string[] = [];

    // Check DB duplicates
    if (existingTags.has(data.assetTag)) {
      rowErrors.push(`Mã tài sản '${data.assetTag}' đã tồn tại trong hệ thống.`);
    }
    if (data.serialNumber && existingSerials.has(data.serialNumber)) {
      rowErrors.push(`Số Serial '${data.serialNumber}' đã tồn tại trong hệ thống.`);
    }

    // Resolve or auto-create Category
    let categoryId = categoriesMap.get(data.categoryName.toLowerCase());
    if (!categoryId && data.categoryName) {
      try {
        const newCat = await prisma.assetCategory.create({
          data: { name: data.categoryName },
        });
        categoryId = newCat.id;
        categoriesMap.set(data.categoryName.toLowerCase(), newCat.id);
      } catch {
        rowErrors.push(`Không thể tạo danh mục '${data.categoryName}'.`);
      }
    }

    // Resolve or auto-create Vendor
    let vendorId = data.vendorName ? vendorsMap.get(data.vendorName.toLowerCase()) : undefined;
    if (!vendorId && data.vendorName) {
      try {
        const newVendor = await prisma.vendor.create({
          data: { name: data.vendorName },
        });
        vendorId = newVendor.id;
        vendorsMap.set(data.vendorName.toLowerCase(), newVendor.id);
      } catch {
        // Ignored, optional field
      }
    }

    // Resolve or auto-create Location
    let locationId = data.locationName ? locationsMap.get(data.locationName.toLowerCase()) : undefined;
    if (!locationId && data.locationName) {
      try {
        const newLoc = await prisma.location.create({
          data: { name: data.locationName },
        });
        locationId = newLoc.id;
        locationsMap.set(data.locationName.toLowerCase(), newLoc.id);
      } catch {
        // Ignored, optional field
      }
    }

    // Validate Status & Condition enums
    const validStatus = ['AVAILABLE', 'IN_USE', 'MAINTENANCE', 'RETIRED', 'LOST'];
    const assetStatus: AssetStatus = validStatus.includes(data.status?.toUpperCase() || '')
      ? (data.status?.toUpperCase() as AssetStatus)
      : 'AVAILABLE';

    const validCondition = ['NEW', 'GOOD', 'FAIR', 'POOR', 'BROKEN'];
    const assetCondition: AssetCondition = validCondition.includes(data.condition?.toUpperCase() || '')
      ? (data.condition?.toUpperCase() as AssetCondition)
      : 'NEW';

    // If there are errors for this row, record failure
    if (rowErrors.length > 0 || !data.assetTag || !data.name || !categoryId) {
      failedRows++;
      const combinedMsg = rowErrors.join(' ');
      errors.push({ rowNumber, field: 'row', message: combinedMsg });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: combinedMsg,
        },
      });
      continue;
    }

    // Insert Asset into Database
    try {
      const createdAsset = await prisma.asset.create({
        data: {
          assetTag: data.assetTag,
          name: data.name,
          categoryId,
          brand: data.brand || null,
          model: data.model || null,
          serialNumber: data.serialNumber || null,
          status: assetStatus,
          condition: assetCondition,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          purchasePrice: data.purchasePrice || null,
          purchaseCurrency: 'VND',
          warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
          vendorId: vendorId || null,
          locationId: locationId || null,
          companyName: data.companyName || null,
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

      if (data.companyName) {
        newCompanies.add(data.companyName);
      }

      // Auto-assign to user if email matches
      if (data.userEmail) {
        const cleanEmail = extractEmail(data.userEmail);
        const targetUser = cleanEmail ? usersByEmail.get(cleanEmail) : null;
        if (targetUser) {
          try {
            await prisma.assetAssignment.create({
              data: {
                assetId: createdAsset.id,
                userId: targetUser.id,
                assignedById: userId,
                assignedAt: new Date(),
                notes: 'Tự động gán cho người sử dụng khi Import Excel',
              },
            });

            if (assetStatus === 'AVAILABLE') {
              await prisma.asset.update({
                where: { id: createdAsset.id },
                data: { status: 'IN_USE' },
              });
            }

            await createAuditLog({
              action: 'ASSIGN',
              entityType: 'Asset',
              entityId: createdAsset.id,
              changes: {
                assignedToUserId: targetUser.id,
                assignedToEmail: targetUser.email,
                assignedToName: targetUser.fullName,
                source: 'EXCEL_IMPORT',
              },
              userId,
            });
          } catch (assignErr) {
            console.warn(`Could not auto-assign asset ${createdAsset.assetTag} to user ${targetUser.email}:`, assignErr);
          }
        }
      }

      // Update duplicate sets
      existingTags.add(data.assetTag);
      if (data.serialNumber) existingSerials.add(data.serialNumber);

      successRows++;

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'SUCCESS',
          entityId: createdAsset.id,
        },
      });
    } catch (err) {
      failedRows++;
      const errMsg = err instanceof Error ? err.message : 'Database error';
      errors.push({ rowNumber, field: 'db', message: errMsg });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
    }
  }

  // Auto-sync new company names into corporate.companies setting
  if (newCompanies.size > 0) {
    await syncCorporateCompanies(newCompanies);
  }

  // 4. Update Batch status
  const finalStatus: ImportBatchStatus =
    failedRows === 0 ? 'COMPLETED' : successRows === 0 ? 'FAILED' : 'COMPLETED';

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      totalRows,
      successRows,
      failedRows,
      status: finalStatus,
    },
  });

  // 5. Audit Log
  await createAuditLog({
    action: 'IMPORT',
    entityType: 'Asset',
    entityId: batch.id,
    userId,
    changes: {
      fileName,
      totalRows,
      successRows,
      failedRows,
    },
  });

  return {
    batchId: batch.id,
    fileName,
    importType: 'ASSET',
    totalRows,
    successRows,
    failedRows,
    errors,
    status: finalStatus,
  };
}

/**
 * Parse and import licenses from Excel buffer
 */
export async function importLicensesFromExcel(
  fileBuffer: Buffer,
  fileName: string,
  userId: string
): Promise<ImportResultSummary> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('File Excel không có sheet nào.');
  }

  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      importType: 'LICENSE',
      status: 'PROCESSING',
      importedById: userId,
    },
  });

  const rowsData: { rowNumber: number; data: LicenseRowData }[] = [];
  const errors: RowValidationError[] = [];

  const headerRow = worksheet.getRow(1);
  const colMap = detectLicenseColumns(headerRow);

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name = getCellValue(row.getCell(colMap.name))?.trim();
    const licenseKey = colMap.licenseKey ? getCellValue(row.getCell(colMap.licenseKey))?.trim() : undefined;
    const licenseType = colMap.licenseType ? getCellValue(row.getCell(colMap.licenseType))?.trim() : undefined;
    const totalSeats = colMap.totalSeats ? parseNumberValue(row.getCell(colMap.totalSeats).value) || 1 : 1;
    const purchaseDate = colMap.purchaseDate ? parseDateValue(row.getCell(colMap.purchaseDate).value) : undefined;
    const expiryDate = colMap.expiryDate ? parseDateValue(row.getCell(colMap.expiryDate).value) : undefined;
    const purchasePrice = colMap.purchasePrice ? parseNumberValue(row.getCell(colMap.purchasePrice).value) : undefined;
    const vendorName = colMap.vendorName ? getCellValue(row.getCell(colMap.vendorName))?.trim() : undefined;
    const companyName = colMap.companyName ? getCellValue(row.getCell(colMap.companyName))?.trim() : undefined;
    const userEmail = colMap.userEmail ? getCellValue(row.getCell(colMap.userEmail))?.trim() : undefined;
    const notes = colMap.notes ? getCellValue(row.getCell(colMap.notes))?.trim() : undefined;

    if (!name) return;

    rowsData.push({
      rowNumber,
      data: {
        name,
        licenseKey,
        licenseType,
        totalSeats,
        purchaseDate,
        expiryDate,
        purchasePrice,
        vendorName,
        companyName,
        userEmail,
        notes,
      },
    });
  });

  const totalRows = rowsData.length;
  let successRows = 0;
  let failedRows = 0;

  const usersByEmail = new Map<string, { id: string; email: string; fullName: string }>();
  (await prisma.user.findMany({ select: { id: true, email: true, fullName: true } })).forEach((u) => {
    usersByEmail.set(u.email.toLowerCase().trim(), u);
  });

  const vendorsMap = new Map<string, string>();
  (await prisma.vendor.findMany({ select: { id: true, name: true } })).forEach((v) =>
    vendorsMap.set(v.name.toLowerCase(), v.id)
  );

  const newCompanies = new Set<string>();

  for (const item of rowsData) {
    const { rowNumber, data } = item;

    if (!data.name) {
      failedRows++;
      errors.push({ rowNumber, field: 'name', message: 'Tên phần mềm là bắt buộc.' });
      continue;
    }

    let vendorId = data.vendorName ? vendorsMap.get(data.vendorName.toLowerCase()) : undefined;
    if (!vendorId && data.vendorName) {
      try {
        const newVendor = await prisma.vendor.create({ data: { name: data.vendorName } });
        vendorId = newVendor.id;
        vendorsMap.set(data.vendorName.toLowerCase(), newVendor.id);
      } catch {
        // Ignored
      }
    }

    const validTypes = ['PERPETUAL', 'SUBSCRIPTION', 'OEM', 'TRIAL', 'OPEN_SOURCE'];
    const type: LicenseType = validTypes.includes(data.licenseType?.toUpperCase() || '')
      ? (data.licenseType?.toUpperCase() as LicenseType)
      : 'PERPETUAL';

    try {
      const createdLicense = await prisma.license.create({
        data: {
          name: data.name,
          licenseKey: data.licenseKey || null,
          licenseType: type,
          totalSeats: data.totalSeats || 1,
          usedSeats: 0,
          purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
          expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
          purchasePrice: data.purchasePrice || null,
          purchaseCurrency: 'VND',
          vendorId: vendorId || null,
          companyName: data.companyName || null,
          status: 'ACTIVE',
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

      if (data.companyName) {
        newCompanies.add(data.companyName);
      }

      // Auto-assign license seat to user if email matches
      if (data.userEmail) {
        const cleanEmail = extractEmail(data.userEmail);
        const targetUser = cleanEmail ? usersByEmail.get(cleanEmail) : null;
        if (targetUser) {
          try {
            await prisma.licenseAssignment.create({
              data: {
                licenseId: createdLicense.id,
                userId: targetUser.id,
                assignedById: userId,
                assignedAt: new Date(),
                notes: 'Tự động gán cho người sử dụng khi Import Excel',
              },
            });

            await prisma.license.update({
              where: { id: createdLicense.id },
              data: { usedSeats: { increment: 1 } },
            });

            await createAuditLog({
              action: 'ASSIGN',
              entityType: 'License',
              entityId: createdLicense.id,
              changes: {
                assignedToUserId: targetUser.id,
                assignedToEmail: targetUser.email,
                assignedToName: targetUser.fullName,
                source: 'EXCEL_IMPORT',
              },
              userId,
            });
          } catch (assignErr) {
            console.warn(`Could not auto-assign license ${createdLicense.name} to user ${targetUser.email}:`, assignErr);
          }
        }
      }

      successRows++;
      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'SUCCESS',
          entityId: createdLicense.id,
        },
      });
    } catch (err) {
      failedRows++;
      const errMsg = err instanceof Error ? err.message : 'Database error';
      errors.push({ rowNumber, field: 'db', message: errMsg });

      await prisma.importRecord.create({
        data: {
          batchId: batch.id,
          rowNumber,
          rawData: data as unknown as object,
          status: 'FAILED',
          errorMessage: errMsg,
        },
      });
    }
  }

  // Auto-sync new company names into corporate.companies setting
  if (newCompanies.size > 0) {
    await syncCorporateCompanies(newCompanies);
  }

  const finalStatus: ImportBatchStatus =
    failedRows === 0 ? 'COMPLETED' : successRows === 0 ? 'FAILED' : 'COMPLETED';

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { totalRows, successRows, failedRows, status: finalStatus },
  });

  await createAuditLog({
    action: 'IMPORT',
    entityType: 'License',
    entityId: batch.id,
    userId,
    changes: { fileName, totalRows, successRows, failedRows },
  });

  return {
    batchId: batch.id,
    fileName,
    importType: 'LICENSE',
    totalRows,
    successRows,
    failedRows,
    errors,
    status: finalStatus,
  };
}

// ==================== VALUE PARSERS & COLUMN DETECTORS ====================

function extractEmail(val: unknown): string | null {
  if (!val) return null;
  const str = String(val).trim();
  const match = str.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase().trim() : (str.includes('@') ? str.toLowerCase().trim() : null);
}

export async function syncCorporateCompanies(companies: Iterable<string | null | undefined>): Promise<void> {
  const list = Array.from(companies)
    .map((c) => (c ? String(c).trim() : ''))
    .filter(Boolean);
  if (list.length === 0) return;

  try {
    const setting = await prisma.systemSetting.findUnique({ where: { key: 'corporate.companies' } });
    let currentCompanies: string[] = [];
    if (setting?.value) {
      try {
        currentCompanies = JSON.parse(setting.value);
      } catch {}
    }
    let added = false;
    for (const comp of list) {
      if (!currentCompanies.includes(comp)) {
        currentCompanies.push(comp);
        added = true;
      }
    }
    if (added) {
      await prisma.systemSetting.upsert({
        where: { key: 'corporate.companies' },
        create: {
          key: 'corporate.companies',
          value: JSON.stringify(currentCompanies),
          type: 'JSON',
          group: 'general',
          label: 'Danh sách công ty quản lý trong tập đoàn',
        },
        update: {
          value: JSON.stringify(currentCompanies),
        },
      });
    }
  } catch (err) {
    console.warn('Could not auto-sync corporate.companies:', err);
  }
}

interface AssetColumnMap {
  assetTag: number;
  name: number;
  categoryName: number;
  brand: number;
  model: number;
  serialNumber: number;
  status: number;
  condition: number;
  purchaseDate: number;
  purchasePrice: number;
  warrantyExpiry: number;
  vendorName: number;
  locationName: number;
  companyName: number;
  userEmail: number;
  notes: number;
}

function detectAssetColumns(headerRow: ExcelJS.Row): AssetColumnMap {
  const map: Partial<AssetColumnMap> = {};
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value?.toString().trim().toLowerCase() || '';
    if (val.includes('mã tài sản') || val.includes('ma tai san') || val.includes('asset tag') || val.includes('mã ts')) {
      map.assetTag = colNumber;
    } else if (val.includes('tên thiết bị') || val.includes('ten thiet bi') || val.includes('tên tài sản') || val.includes('device name')) {
      map.name = colNumber;
    } else if (val.includes('danh mục') || val.includes('danh muc') || val.includes('category')) {
      map.categoryName = colNumber;
    } else if (val.includes('thương hiệu') || val.includes('thuong hieu') || val.includes('hãng') || val.includes('brand')) {
      map.brand = colNumber;
    } else if (val.includes('model')) {
      map.model = colNumber;
    } else if (val.includes('serial')) {
      map.serialNumber = colNumber;
    } else if (val.includes('trạng thái') || val.includes('trang thai') || val.includes('status')) {
      map.status = colNumber;
    } else if (val.includes('tình trạng') || val.includes('tinh trang') || val.includes('condition')) {
      map.condition = colNumber;
    } else if (val.includes('ngày mua') || val.includes('ngay mua') || val.includes('purchase date')) {
      map.purchaseDate = colNumber;
    } else if (val.includes('giá mua') || val.includes('gia mua') || val.includes('purchase price') || val.includes('price')) {
      map.purchasePrice = colNumber;
    } else if (val.includes('bảo hành') || val.includes('bao hanh') || val.includes('warranty')) {
      map.warrantyExpiry = colNumber;
    } else if (val.includes('nhà cung cấp') || val.includes('nha cung cap') || val.includes('vendor')) {
      map.vendorName = colNumber;
    } else if (val.includes('vị trí') || val.includes('vi tri') || val.includes('location')) {
      map.locationName = colNumber;
    } else if (val.includes('công ty') || val.includes('cong ty') || val.includes('pháp nhân') || val.includes('phap nhan') || val.includes('company')) {
      map.companyName = colNumber;
    } else if (val.includes('người sử dụng') || val.includes('nguoi su dung') || val.includes('người dùng') || val.includes('nguoi dung') || val.includes('email') || val.includes('user') || val.includes('assigned')) {
      map.userEmail = colNumber;
    } else if (val.includes('ghi chú') || val.includes('ghi chu') || val.includes('note')) {
      map.notes = colNumber;
    }
  });

  return {
    assetTag: map.assetTag || 1,
    name: map.name || 2,
    categoryName: map.categoryName || 3,
    brand: map.brand || 4,
    model: map.model || 5,
    serialNumber: map.serialNumber || 6,
    status: map.status || 7,
    condition: map.condition || 8,
    purchaseDate: map.purchaseDate || 9,
    purchasePrice: map.purchasePrice || 10,
    warrantyExpiry: map.warrantyExpiry || 11,
    vendorName: map.vendorName || 12,
    locationName: map.locationName || 13,
    companyName: map.companyName || (headerRow.cellCount >= 16 ? 14 : 0),
    userEmail: map.userEmail || (headerRow.cellCount >= 16 ? 15 : (headerRow.cellCount >= 15 ? 14 : 0)),
    notes: map.notes || (map.userEmail ? (map.userEmail === 15 ? 16 : 15) : (headerRow.cellCount >= 16 ? 16 : (headerRow.cellCount >= 15 ? 15 : 14))),
  };
}

interface LicenseColumnMap {
  name: number;
  licenseKey: number;
  licenseType: number;
  totalSeats: number;
  purchaseDate: number;
  expiryDate: number;
  purchasePrice: number;
  vendorName: number;
  companyName: number;
  userEmail: number;
  notes: number;
}

function detectLicenseColumns(headerRow: ExcelJS.Row): LicenseColumnMap {
  const map: Partial<LicenseColumnMap> = {};
  headerRow.eachCell((cell, colNumber) => {
    const val = cell.value?.toString().trim().toLowerCase() || '';
    if (val.includes('tên phần mềm') || val.includes('ten phan mem') || val.includes('tên license') || val.includes('software') || val.includes('tên')) {
      map.name = colNumber;
    } else if (val.includes('key') || val.includes('khóa') || val.includes('khoa')) {
      map.licenseKey = colNumber;
    } else if (val.includes('loại') || val.includes('loai') || val.includes('type')) {
      map.licenseType = colNumber;
    } else if (val.includes('seat') || val.includes('số lượng') || val.includes('so luong')) {
      map.totalSeats = colNumber;
    } else if (val.includes('ngày mua') || val.includes('ngay mua') || val.includes('purchase date')) {
      map.purchaseDate = colNumber;
    } else if (val.includes('hết hạn') || val.includes('het han') || val.includes('expiry')) {
      map.expiryDate = colNumber;
    } else if (val.includes('giá mua') || val.includes('gia mua') || val.includes('price')) {
      map.purchasePrice = colNumber;
    } else if (val.includes('nhà cung cấp') || val.includes('nha cung cap') || val.includes('vendor')) {
      map.vendorName = colNumber;
    } else if (val.includes('công ty') || val.includes('cong ty') || val.includes('pháp nhân') || val.includes('phap nhan') || val.includes('company')) {
      map.companyName = colNumber;
    } else if (val.includes('người sử dụng') || val.includes('nguoi su dung') || val.includes('người dùng') || val.includes('nguoi dung') || val.includes('email') || val.includes('user')) {
      map.userEmail = colNumber;
    } else if (val.includes('ghi chú') || val.includes('ghi chu') || val.includes('note')) {
      map.notes = colNumber;
    }
  });

  return {
    name: map.name || 1,
    licenseKey: map.licenseKey || 2,
    licenseType: map.licenseType || 3,
    totalSeats: map.totalSeats || 4,
    purchaseDate: map.purchaseDate || 5,
    expiryDate: map.expiryDate || 6,
    purchasePrice: map.purchasePrice || 7,
    vendorName: map.vendorName || 8,
    companyName: map.companyName || (headerRow.cellCount >= 11 ? 9 : 0),
    userEmail: map.userEmail || (headerRow.cellCount >= 11 ? 10 : (headerRow.cellCount >= 10 ? 9 : 0)),
    notes: map.notes || (map.userEmail ? (map.userEmail === 10 ? 11 : 10) : (headerRow.cellCount >= 11 ? 11 : (headerRow.cellCount >= 10 ? 10 : 9))),
  };
}

function getCellValue(cell: ExcelJS.Cell): string | null {
  if (cell.value === null || cell.value === undefined) return null;
  if (typeof cell.value === 'object') {
    if ('text' in cell.value && typeof cell.value.text === 'string') {
      return cell.value.text;
    }
    if ('result' in cell.value) {
      return String(cell.value.result ?? '');
    }
  }
  return String(cell.value);
}

function parseNumberValue(val: unknown): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
}

function parseDateValue(val: unknown): string | undefined {
  if (!val) return undefined;
  if (val instanceof Date && !isNaN(val.getTime())) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'string') {
    // Try YYYY-MM-DD
    const isoMatch = val.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (isoMatch) {
      const [, y, m, d] = isoMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // Try DD/MM/YYYY
    const vnMatch = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (vnMatch) {
      const [, d, m, y] = vnMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }
  return undefined;
}

export async function generateServiceTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Mau_Import_Dich_Vu');

  worksheet.columns = [
    { header: 'Mã Dịch Vụ (*)', key: 'serviceCode', width: 16 },
    { header: 'Tên Gói Dịch Vụ (*)', key: 'name', width: 35 },
    { header: 'Loại Dịch Vụ (*)', key: 'serviceType', width: 22 },
    { header: 'Giá Cước (VNĐ)', key: 'cost', width: 18 },
    { header: 'Chu Kỳ (*)', key: 'billingCycle', width: 16 },
    { header: 'Ngày Bắt Đầu (YYYY-MM-DD)', key: 'startDate', width: 22 },
    { header: 'Ngày Gia Hạn (YYYY-MM-DD)', key: 'renewalDate', width: 22 },
    { header: 'Mã Thuê Bao / Khách Hàng', key: 'accountNumber', width: 22 },
    { header: 'IP Tĩnh / Cấu Hình', key: 'ipStatic', width: 20 },
    { header: 'Băng Thông / Thông Số', key: 'bandwidth', width: 22 },
    { header: 'Nhà Cung Cấp / Đối Tác', key: 'vendorName', width: 25 },
    { header: 'Công Ty Quản Lý', key: 'companyName', width: 25 },
    { header: 'Vị Trí Lắp Đặt', key: 'locationName', width: 20 },
    { header: 'Hotline Hỗ Trợ', key: 'contactSupport', width: 25 },
    { header: 'Ghi Chú', key: 'notes', width: 30 },
  ];

  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF6B21A8' },
  };

  worksheet.addRow({
    serviceCode: 'SVC-NET-001',
    name: 'Đường truyền Internet Cáp quang FTTH Viettel Pro 500Mbps',
    serviceType: 'INTERNET',
    cost: 1500000,
    billingCycle: 'MONTHLY',
    startDate: '2025-01-01',
    renewalDate: '2026-01-01',
    accountNumber: 'HNI_FTTH_588291',
    ipStatic: '115.78.22.105 / 29',
    bandwidth: '500 Mbps Quốc tế 30 Mbps',
    vendorName: 'Viettel Telecom',
    companyName: 'Công ty Cổ phần Tập đoàn ABC',
    locationName: 'Phòng IT',
    contactSupport: '18008119 - KTV: 0988.123.456',
    notes: 'Bảo trì định kỳ hàng tháng',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
