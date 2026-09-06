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
    status: 'AVAILABLE',
    condition: 'NEW',
    purchaseDate: '2024-01-15',
    purchasePrice: 24500000,
    warrantyExpiry: '2027-01-15',
    vendorName: 'Phong Vũ',
    locationName: 'Phòng IT',
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
    notes: '',
  });

  // Instruction sheet
  const instructionSheet = workbook.addWorksheet('Hướng dẫn nhập');
  instructionSheet.columns = [
    { header: 'Cột', key: 'col', width: 25 },
    { header: 'Quy tắc & Giá trị cho phép', key: 'rule', width: 60 },
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
    notes: 'Cấp phát cho Team Design & Marketing',
  });

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

  // 1. Parse Excel rows (skip header row 1)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const assetTag = getCellValue(row.getCell(1))?.trim();
    const name = getCellValue(row.getCell(2))?.trim();
    const categoryName = getCellValue(row.getCell(3))?.trim();
    const brand = getCellValue(row.getCell(4))?.trim();
    const model = getCellValue(row.getCell(5))?.trim();
    const serialNumber = getCellValue(row.getCell(6))?.trim();
    const status = getCellValue(row.getCell(7))?.trim();
    const condition = getCellValue(row.getCell(8))?.trim();
    const purchaseDate = parseDateValue(row.getCell(9).value);
    const purchasePrice = parseNumberValue(row.getCell(10).value);
    const warrantyExpiry = parseDateValue(row.getCell(11).value);
    const vendorName = getCellValue(row.getCell(12))?.trim();
    const locationName = getCellValue(row.getCell(13))?.trim();
    const notes = getCellValue(row.getCell(14))?.trim();

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
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

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

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const name = getCellValue(row.getCell(1))?.trim();
    const licenseKey = getCellValue(row.getCell(2))?.trim();
    const licenseType = getCellValue(row.getCell(3))?.trim();
    const totalSeats = parseNumberValue(row.getCell(4).value) || 1;
    const purchaseDate = parseDateValue(row.getCell(5).value);
    const expiryDate = parseDateValue(row.getCell(6).value);
    const purchasePrice = parseNumberValue(row.getCell(7).value);
    const vendorName = getCellValue(row.getCell(8))?.trim();
    const notes = getCellValue(row.getCell(9))?.trim();

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
        notes,
      },
    });
  });

  const totalRows = rowsData.length;
  let successRows = 0;
  let failedRows = 0;

  const vendorsMap = new Map<string, string>();
  (await prisma.vendor.findMany({ select: { id: true, name: true } })).forEach((v) =>
    vendorsMap.set(v.name.toLowerCase(), v.id)
  );

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
          status: 'ACTIVE',
          notes: data.notes ? `[Import Excel] ${data.notes}` : '[Import Excel]',
        },
      });

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

// ==================== VALUE PARSERS ====================

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
