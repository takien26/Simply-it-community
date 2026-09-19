import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  hasPermission,
  getRoleLevel,
  isSuperAdmin,
  isAdminOrAbove,
  canAssignRole,
} from '@/lib/permissions';
import { createAuditLog } from '@/lib/audit';
import { getActiveLicense } from '@/lib/license';
import * as ExcelJS from 'exceljs';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// GET /api/users/import - Download sample Excel template
export async function GET() {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Simply IT Community';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Danh Sách Nhân Sự Mẫu', {
      views: [{ showGridLines: true }],
    });

    // Title Header
    sheet.mergeCells('A1:L1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'MẪU IMPORT DANH SÁCH NHÂN SỰ & NGƯỜI DÙNG HỆ THỐNG';
    titleCell.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF6366F1' },
    };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 34;

    // Subtitle instruction
    sheet.mergeCells('A2:L2');
    const subtitleCell = sheet.getCell('A2');
    subtitleCell.value = 'Hệ thống tự động đồng bộ: Công ty, Khối/Phòng ban, Chức danh, Cơ sở làm việc (Location) & Quản lý trực tiếp theo Email.';
    subtitleCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 22;

    sheet.addRow([]); // Blank row 3

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

    const headerRow = sheet.addRow(headers);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF312E81' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    });

    // Sample data rows
    const sampleRows = [
      [
        1,
        'Nguyễn Văn An',
        'nguyen.an@company.com',
        'Tập Đoàn Simply IT Holdings',
        'Ban Công Nghệ Thông Tin (IT / CNTT) > Quản Trị Hệ Thống & Cloud (System Admin)',
        'Kỹ Sư Hệ Thống Cao Cấp',
        '0912345678',
        'Trụ Sở Chính - Tầng 8',
        'lead.it@company.com',
        'IT Support',
        'Đang làm việc',
        'Staff@123',
      ],
      [
        2,
        'Trần Thị Bích',
        'tran.bich@company.com',
        'Công Ty Thành Viên Bravo Retail',
        'Khối Tài Chính & Kế Toán > Kế Toán Tổng Hợp',
        'Chuyên Viên Kế Toán',
        '0987654321',
        'Chi Nhánh Hà Nội',
        'cfo@company.com',
        'Staff',
        'Đang làm việc',
        'Staff@123',
      ],
    ];

    sampleRows.forEach((rowData) => {
      const row = sheet.addRow(rowData);
      row.height = 22;
      row.eachCell((cell, colNumber) => {
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

    sheet.columns = [
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

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(buffer as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Mau_Import_Nhan_Su.xlsx"',
      },
    });
  } catch (error) {
    console.error('Download template error:', error);
    return NextResponse.json({ error: 'Failed to generate template' }, { status: 500 });
  }
}

// POST /api/users/import - Process Excel Upload
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const license = await getActiveLicense();
    if (!license.isEnterprise) {
      return NextResponse.json(
        { error: 'Tính năng Import nhân sự hàng loạt từ file Excel chỉ khả dụng cho tài khoản trả phí (Enterprise Edition).' },
        { status: 403 }
      );
    }

    const callerLevel = getRoleLevel(user.roleName);
    const callerIsSuperAdmin = isSuperAdmin(user.roleName);
    const isCallerAdminOrAbove = isAdminOrAbove(user.roleName);
    const canCreate = isCallerAdminOrAbove || (await hasPermission(user.userId, 'users.create'));
    if (!canCreate) {
      return NextResponse.json({ error: 'Bạn không có quyền import nhân sự' }, { status: 403 });
    }
    const hasPermissionAssignRole = isCallerAdminOrAbove || (await hasPermission(user.userId, 'users.permissions'));

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)' }, { status: 400 });
    }

    const fileName = file.name;
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      return NextResponse.json({ error: 'Định dạng file không hợp lệ. Chỉ chấp nhận .xlsx hoặc .xls' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json({ error: 'File Excel không có dữ liệu sheet hợp lệ' }, { status: 400 });
    }

    // Identify header row dynamically
    let headerRowNumber = 1;
    let colMap: Record<string, number> = {};

    for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
      const row = worksheet.getRow(r);
      const rowValues: string[] = [];
      row.eachCell((cell) => {
        rowValues.push(String(cell.value || '').trim().toLowerCase());
      });

      const hasEmail = rowValues.some((v) => v.includes('email'));
      const hasName = rowValues.some((v) => v.includes('họ') || v.includes('name'));

      if (hasEmail || hasName) {
        headerRowNumber = r;
        row.eachCell((cell, colNumber) => {
          const val = String(cell.value || '').trim().toLowerCase();
          if (val.includes('họ') || val.includes('name') || val.includes('tên')) {
            colMap.fullName = colNumber;
          } else if (val.includes('email') && !val.includes('quản lý') && !val.includes('manager')) {
            colMap.email = colNumber;
          } else if (val.includes('công ty') || val.includes('company')) {
            colMap.companyName = colNumber;
          } else if (val.includes('phòng') || val.includes('bộ phận') || val.includes('khối') || val.includes('dept')) {
            colMap.department = colNumber;
          } else if (val.includes('chức') || val.includes('vị trí') || val.includes('title') || val.includes('position')) {
            colMap.position = colNumber;
          } else if (val.includes('thoại') || val.includes('phone') || val.includes('sđt') || val.includes('mobile')) {
            colMap.phone = colNumber;
          } else if (val.includes('khu vực') || val.includes('cơ sở') || val.includes('văn phòng') || val.includes('chi nhánh') || val.includes('nhà máy') || val.includes('location')) {
            colMap.locationName = colNumber;
          } else if (val.includes('quản lý') || val.includes('manager')) {
            colMap.managerEmail = colNumber;
          } else if (val.includes('vai trò') || val.includes('quyền') || val.includes('role')) {
            colMap.roleName = colNumber;
          } else if (val.includes('trạng thái') || val.includes('tình trạng') || val.includes('status')) {
            colMap.status = colNumber;
          } else if (val.includes('mật khẩu') || val.includes('pass')) {
            colMap.password = colNumber;
          }
        });
        break;
      }
    }

    // Fallback default column indexes if header detection didn't find specific ones
    if (!colMap.fullName) colMap.fullName = 2;
    if (!colMap.email) colMap.email = 3;
    if (!colMap.companyName) colMap.companyName = 4;
    if (!colMap.department) colMap.department = 5;
    if (!colMap.position) colMap.position = 6;
    if (!colMap.phone) colMap.phone = 7;
    if (!colMap.locationName) colMap.locationName = 8;
    if (!colMap.managerEmail) colMap.managerEmail = 9;
    if (!colMap.roleName) colMap.roleName = 10;
    if (!colMap.status) colMap.status = 11;
    if (!colMap.password) colMap.password = 12;

    // Preload roles and locations cache
    const allRoles = await prisma.role.findMany();
    let defaultRole = allRoles.find((r) => r.name.toLowerCase() === 'staff') ||
      allRoles.find((r) => r.isSystem) ||
      allRoles[0];

    const defaultRoleId = defaultRole?.id;
    if (!defaultRoleId) {
      return NextResponse.json({ error: 'Không tìm thấy vai trò mặc định trong hệ thống' }, { status: 500 });
    }

    const allLocations = await prisma.location.findMany();
    const locationCache = new Map<string, string>();
    allLocations.forEach((loc) => {
      locationCache.set(loc.name.toLowerCase().trim(), loc.id);
    });

    const defaultPasswordHash = await bcrypt.hash('Staff@123', 10);

    let totalRows = 0;
    let importedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    const errors: { row: number; email?: string; error: string }[] = [];
    const newCompaniesSet = new Set<string>();

    for (let r = headerRowNumber + 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const getCellString = (colIndex?: number) => {
        if (!colIndex) return '';
        const cell = row.getCell(colIndex);
        if (!cell || cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object' && 'text' in cell.value) {
          return String((cell.value as any).text).trim();
        }
        return String(cell.value).trim();
      };

      const fullName = getCellString(colMap.fullName);
      const rawEmail = getCellString(colMap.email);
      const companyName = getCellString(colMap.companyName) || null;
      const department = getCellString(colMap.department) || null;
      const position = getCellString(colMap.position) || null;
      const phone = getCellString(colMap.phone) || null;
      const locationName = getCellString(colMap.locationName) || null;
      const managerEmail = getCellString(colMap.managerEmail) || null;
      const roleName = getCellString(colMap.roleName) || null;
      const rawStatus = getCellString(colMap.status) || null;
      const rawPassword = getCellString(colMap.password);

      // Skip completely empty rows
      if (!fullName && !rawEmail) continue;

      totalRows++;

      if (!fullName) {
        errors.push({ row: r, error: 'Họ và tên không được để trống' });
        failedCount++;
        continue;
      }

      if (!rawEmail || !rawEmail.includes('@')) {
        errors.push({ row: r, error: `Email không hợp lệ: "${rawEmail}"` });
        failedCount++;
        continue;
      }

      const email = rawEmail.toLowerCase().trim();

      if (companyName) {
        newCompaniesSet.add(companyName);
      }

      // Resolve Location ID (find or auto-create)
      let locationId: string | null = null;
      if (locationName) {
        const cleanLoc = locationName.trim();
        const locKey = cleanLoc.toLowerCase();
        if (locationCache.has(locKey)) {
          locationId = locationCache.get(locKey)!;
        } else {
          try {
            const newLoc = await prisma.location.create({ data: { name: cleanLoc } });
            locationId = newLoc.id;
            locationCache.set(locKey, newLoc.id);
          } catch {
            const found = await prisma.location.findFirst({ where: { name: { equals: cleanLoc, mode: 'insensitive' } } });
            if (found) {
              locationId = found.id;
              locationCache.set(locKey, found.id);
            }
          }
        }
      }

      // Resolve Manager ID
      let managerId: string | null = null;
      if (managerEmail && managerEmail.includes('@')) {
        const cleanMgrEmail = managerEmail.toLowerCase().trim();
        const manager = await prisma.user.findUnique({ where: { email: cleanMgrEmail } });
        if (manager) {
          managerId = manager.id;
        }
      }

      // 1.1: Mặc định tất cả nhân sự import từ Excel là quyền user (Staff)
      // Chỉ khi người thực hiện có quyền Admin/Super Admin hoặc users.permissions thì mới được phép gán role từ Excel,
      // và chỉ được add quyền ngang hoặc thấp hơn vai trò của chính mình (chỉ Super Admin mới gán được Super Admin).
      let assignedRoleId = defaultRoleId;
      if (hasPermissionAssignRole && roleName) {
        const cleanRole = roleName.toLowerCase().trim();
        const matchedRole = allRoles.find((r) =>
          r.name.toLowerCase() === cleanRole ||
          (cleanRole.includes('super') && r.name.toLowerCase().includes('super')) ||
          (cleanRole.includes('admin') && r.name.toLowerCase().includes('admin')) ||
          (cleanRole.includes('it') && r.name.toLowerCase().includes('it'))
        );
        if (matchedRole) {
          const targetRoleLevel = getRoleLevel(matchedRole.name);
          // HIERARCHY RULE: Không cho phép gán vai trò cao hơn cấp bậc của caller
          if (canAssignRole(callerLevel, targetRoleLevel)) {
            assignedRoleId = matchedRole.id;
          }
        }
      }

      // Resolve Status (isActive)
      let isActive = true;
      if (rawStatus) {
        const s = rawStatus.toLowerCase().trim();
        if (s.includes('nghỉ') || s.includes('off') || s.includes('inactive') || s.includes('khóa') || s === 'false') {
          isActive = false;
        }
      }

      try {
        const existing = await prisma.user.findUnique({
          where: { email },
          include: { role: true },
        });
        if (existing) {
          const existingLevel = getRoleLevel(existing.role?.name);

          // HIERARCHY RULE: Người dùng không được phép sửa đổi/khóa/ghi đè tài khoản có cấp bậc cao hơn mình
          if (existingLevel > callerLevel) {
            errors.push({ row: r, error: `Không thể chỉnh sửa hoặc ghi đè tài khoản có cấp bậc cao hơn bạn (${email})` });
            failedCount++;
            continue;
          }

          if (existingLevel >= 100 && !callerIsSuperAdmin) {
            errors.push({ row: r, error: `Không thể can thiệp tài khoản Quản trị viên Tối cao (${email})` });
            failedCount++;
            continue;
          }

          // Nếu người import không có quyền gán role, giữ nguyên vai trò hiện tại của người dùng
          const finalRoleId = hasPermissionAssignRole ? assignedRoleId : existing.roleId;

          // Smart update existing user profile
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              fullName,
              ...(companyName ? { companyName } : {}),
              ...(department ? { department } : {}),
              ...(position ? { position } : {}),
              ...(phone ? { phone } : {}),
              ...(locationId ? { locationId } : {}),
              ...(managerId ? { managerId } : {}),
              roleId: finalRoleId,
              isActive,
            },
          });
          updatedCount++;
        } else {
          // Create new user
          const passwordHash = rawPassword
            ? await bcrypt.hash(rawPassword, 10)
            : defaultPasswordHash;

          await prisma.user.create({
            data: {
              email,
              fullName,
              companyName,
              department,
              position,
              phone,
              locationId,
              managerId,
              roleId: assignedRoleId,
              passwordHash,
              isActive,
            },
          });
          importedCount++;
        }
      } catch (err: any) {
        console.error(`Import user error at row ${r}:`, err);
        errors.push({ row: r, email, error: err.message || 'Lỗi lưu dữ liệu' });
        failedCount++;
      }
    }

    // Auto-register new companies into corporate.companies setting if any
    if (newCompaniesSet.size > 0) {
      try {
        const setting = await prisma.systemSetting.findUnique({ where: { key: 'corporate.companies' } });
        let currentCompanies: string[] = [];
        if (setting && setting.value) {
          try {
            currentCompanies = JSON.parse(setting.value);
          } catch {}
        }
        let addedNew = false;
        newCompaniesSet.forEach((c) => {
          if (!currentCompanies.includes(c)) {
            currentCompanies.push(c);
            addedNew = true;
          }
        });
        if (addedNew) {
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
      } catch (e) {
        console.warn('Failed to update corporate.companies during user import:', e);
      }
    }

    // Audit log
    await createAuditLog({
      action: 'IMPORT',
      entityType: 'User',
      entityId: 'users_bulk_import',
      changes: {
        fileName,
        totalRows,
        importedCount,
        updatedCount,
        failedCount,
      },
      userId: user.userId,
    });

    return NextResponse.json({
      success: true,
      totalRows,
      importedCount,
      updatedCount,
      failedCount,
      errors,
      message: `Xử lý hoàn tất ${totalRows} dòng: Tạo mới ${importedCount} nhân sự, cập nhật ${updatedCount} nhân sự${failedCount > 0 ? `, thất bại ${failedCount} dòng.` : '.'}`,
    });
  } catch (error: any) {
    console.error('Import users error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Xử lý file import thất bại' },
      { status: 500 }
    );
  }
}
