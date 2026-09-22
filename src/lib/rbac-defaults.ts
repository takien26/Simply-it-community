import { PrismaClient } from '@prisma/client';

export interface DefaultPermission {
  code: string;
  name: string;
  module: string;
  description?: string;
}

export interface DefaultRole {
  name: string;
  description: string;
  level: number;
  isSystem: boolean;
}

// ==================== 1. HIERARCHY SCORES ====================
export const ROLE_HIERARCHY: Record<string, number> = {
  'Super Admin': 100, // Cấp độ tối cao: Root Authority, toàn quyền tuyệt đối
  'Admin': 80,        // Cấp độ quản trị: System Administrator
  'Asset Manager': 50, // Cấp độ kỹ thuật & quản lý IT: IT Specialist
  'IT Support': 50,   // Kỹ thuật viên hỗ trợ
  'Technician': 50,   // Kỹ thuật viên bảo trì
  'Staff': 10,        // Cấp độ nhân viên thông thường: Self-Service User
  'User': 10,         // Đồng nghĩa Staff
};

export function getRoleLevel(roleName?: string | null): number {
  if (!roleName) return 0;
  return ROLE_HIERARCHY[roleName] ?? 20; // Các vai trò tùy biến mặc định cấp 20
}

export function isSuperAdmin(roleName?: string | null): boolean {
  return roleName === 'Super Admin';
}

export function isAdminOrAbove(roleName?: string | null): boolean {
  return roleName === 'Super Admin' || roleName === 'Admin';
}

/**
 * Kiểm tra xem caller có quyền xóa/vô hiệu hóa target user hay không.
 * Nguyên tắc cốt lõi:
 * 1. Không ai được xóa Super Admin.
 * 2. Không được xóa người có quyền cao hơn mình (targetLevel > callerLevel).
 * 3. Không được xóa người có quyền ngang mình (trừ Super Admin có thể quản lý các admin khác, nhưng không tự xóa chính mình).
 */
export function canDeleteUser(callerLevel: number, targetLevel: number, isCallerSuperAdmin = false): boolean {
  if (targetLevel >= 100) return false; // Không ai được xóa Super Admin
  if (isCallerSuperAdmin) return true; // Super Admin được xóa cấp dưới (Admin, Manager, Staff)
  return callerLevel > targetLevel;    // Caller phải có cấp bậc cao hơn người bị xóa
}

/**
 * Kiểm tra xem caller có quyền chỉnh sửa người dùng khác hay không.
 * Nguyên tắc cốt lõi:
 * 1. Chính chủ được sửa thông tin cá nhân cơ bản (isSelf = true).
 * 2. Không được sửa người có cấp bậc cao hơn mình (callerLevel < targetLevel).
 * 3. Chỉ Super Admin mới được sửa thông tin của Super Admin.
 */
export function canModifyUser(callerLevel: number, targetLevel: number, isSelf = false): boolean {
  if (isSelf) return true;
  if (targetLevel >= 100) return callerLevel >= 100; // Chỉ Super Admin mới được sửa Super Admin
  return callerLevel >= targetLevel; // Caller phải có cấp bậc lớn hơn hoặc bằng target
}

/**
 * Kiểm tra xem caller có được phép gán role này hay không.
 * Nguyên tắc cốt lõi:
 * "Chỉ được add quyền ngang hoặc thấp hơn mình" (targetRoleLevel <= callerLevel).
 * Ví dụ: Admin (80) không thể gán Super Admin (100).
 */
export function canAssignRole(callerLevel: number, targetRoleLevel: number): boolean {
  return targetRoleLevel <= callerLevel;
}

// ==================== 2. DANH MỤC QUYỀN HẠN MẶC ĐỊNH TRONG CODE ====================
export const DEFAULT_PERMISSIONS: DefaultPermission[] = [
  // --- 1. DASHBOARD ---
  { code: 'dashboard.view', name: 'Xem Dashboard Tổng quan', module: 'dashboard', description: 'Cho phép truy cập và xem trang chủ Dashboard' },
  { code: 'dashboard.export', name: 'Xuất Báo cáo Dashboard', module: 'dashboard', description: 'Xuất dữ liệu thống kê tổng quan ra Excel/PDF' },

  // --- 2. CỔNG TỰ PHỤC VỤ & HƯỚNG DẪN (PORTAL & KB) ---
  { code: 'portal.view', name: 'Xem Cổng Tự Phục Vụ Nhân Viên', module: 'portal', description: 'Truy cập cổng người dùng cá nhân để gửi yêu cầu và theo dõi thiết bị' },
  { code: 'kb.view', name: 'Xem Hướng dẫn IT (Public)', module: 'kb', description: 'Cho phép xem cẩm nang hướng dẫn sử dụng, xử lý sự cố cơ bản' },
  { code: 'kb.create', name: 'Thêm & Tải lên Tài liệu IT', module: 'kb', description: 'Cho phép soạn thảo bài viết mới và upload file PDF hướng dẫn' },
  { code: 'kb.update', name: 'Chỉnh sửa Hướng dẫn IT', module: 'kb', description: 'Cập nhật nội dung và đính kèm của các bài viết tri thức' },
  { code: 'kb.delete', name: 'Xóa Hướng dẫn IT', module: 'kb', description: 'Xóa bài viết khỏi trung tâm tài liệu' },
  { code: 'kb.internal', name: 'Xem Tài liệu Kỹ thuật Nội bộ IT', module: 'kb', description: 'Xem tài liệu mật, sơ đồ VLAN, cấu hình Server của các Team IT' },

  // --- 3. HỖ TRỢ IT & TICKET HELPDESK ---
  { code: 'tickets.view', name: 'Xem Danh sách Ticket', module: 'tickets', description: 'Xem các phiếu hỗ trợ kỹ thuật' },
  { code: 'tickets.create', name: 'Tạo Ticket Yêu cầu Hỗ trợ', module: 'tickets', description: 'Gửi yêu cầu hỗ trợ sự cố máy tính, mạng, phần mềm' },
  { code: 'tickets.update', name: 'Cập nhật & Xử lý Ticket', module: 'tickets', description: 'Tiếp nhận, xử lý và đổi trạng thái ticket' },
  { code: 'tickets.assign', name: 'Phân công Kỹ thuật viên IT', module: 'tickets', description: 'Chỉ định kỹ thuật viên phụ trách xử lý ticket' },
  { code: 'tickets.delete', name: 'Xóa Ticket', module: 'tickets', description: 'Xóa ticket khỏi hệ thống' },
  { code: 'tickets.sla', name: 'Quản lý & Gia hạn SLA Ticket', module: 'tickets', description: 'Xin gia hạn và điều chỉnh thời hạn cam kết SLA' },
  { code: 'tickets.reports', name: 'Xem Báo cáo & Thống kê Ticket', module: 'reports', description: 'Báo cáo hiệu suất xử lý ticket và SLA' },

  // --- 4. YÊU CẦU & PHÊ DUYỆT THIẾT BỊ (APPROVALS) ---
  { code: 'approvals.view', name: 'Xem Yêu cầu Cấp phát Thiết bị', module: 'approvals', description: 'Xem danh sách các phiếu xin cấp mới, đổi máy tính' },
  { code: 'approvals.create', name: 'Tạo Phiếu Xin Cấp Máy', module: 'approvals', description: 'Lập đơn xin cấp mới hoặc đổi thiết bị hư hỏng' },
  { code: 'approvals.approve', name: 'Duyệt Đơn Cấp Thiết Bị', module: 'approvals', description: 'Phê duyệt hoặc từ chối phiếu xin cấp thiết bị' },

  // --- 5. QUẢN LÝ TÀI SẢN & THIẾT BỊ ---
  { code: 'assets.view', name: 'Xem Danh sách Tài sản', module: 'assets', description: 'Xem danh sách máy tính, thiết bị phần cứng' },
  { code: 'assets.create', name: 'Thêm mới Tài sản', module: 'assets', description: 'Tạo mới hồ sơ máy tính, thiết bị vào hệ thống' },
  { code: 'assets.update', name: 'Chỉnh sửa Thông tin Tài sản', module: 'assets', description: 'Cập nhật thông số kỹ thuật, bảo hành' },
  { code: 'assets.delete', name: 'Xóa & Thanh lý Tài sản', module: 'assets', description: 'Xóa hồ sơ thiết bị hoặc chuyển trạng thái thanh lý' },
  { code: 'assets.assign', name: 'Bàn giao & Thu hồi Tài sản', module: 'assets', description: 'Gán máy tính cho nhân viên hoặc thu hồi về kho' },
  { code: 'assets.import', name: 'Import Tài sản từ Excel', module: 'assets', description: 'Nhập hàng loạt tài sản từ file Excel/CSV' },
  { code: 'assets.export', name: 'Export Dữ liệu Tài sản', module: 'assets', description: 'Xuất danh sách thiết bị ra file Excel' },
  { code: 'assets.audit', name: 'Kiểm kê Tài sản & Quét QR/Barcode', module: 'assets', description: 'Thực hiện đợt kiểm kê tài sản định kỳ' },

  // --- 6. LỊCH SỬ BẢO TRÌ & SỬA CHỮA ---
  { code: 'assets.maintenance.view', name: 'Xem Nhật ký Bảo trì', module: 'assets.maintenance', description: 'Xem lịch sử sửa chữa, bảo dưỡng thiết bị' },
  { code: 'assets.maintenance.create', name: 'Thêm Phiếu Bảo trì', module: 'assets.maintenance', description: 'Ghi nhận sửa chữa, thay thế linh kiện' },
  { code: 'assets.maintenance.update', name: 'Sửa Phiếu Bảo trì', module: 'assets.maintenance', description: 'Cập nhật chi phí, đơn vị sửa chữa' },
  { code: 'assets.maintenance.delete', name: 'Xóa Phiếu Bảo trì', module: 'assets.maintenance', description: 'Xóa bản ghi bảo trì' },

  // --- 7. BẢN QUYỀN PHẦN MỀM (LICENSES) ---
  { code: 'licenses.view', name: 'Xem Danh sách License', module: 'licenses', description: 'Xem các phần mềm có bản quyền' },
  { code: 'licenses.create', name: 'Thêm mới License', module: 'licenses', description: 'Khai báo key bản quyền phần mềm mới' },
  { code: 'licenses.update', name: 'Chỉnh sửa License', module: 'licenses', description: 'Gia hạn, cập nhật số lượng seat license' },
  { code: 'licenses.delete', name: 'Xóa License', module: 'licenses', description: 'Xóa hồ sơ bản quyền' },
  { code: 'licenses.assign', name: 'Cấp phát License cho Nhân viên', module: 'licenses', description: 'Gán seat bản quyền cho nhân sự sử dụng' },
  { code: 'licenses.import', name: 'Import License từ Excel', module: 'licenses', description: 'Nhập hàng loạt license từ Excel' },
  { code: 'licenses.export', name: 'Export License', module: 'licenses', description: 'Xuất danh sách license ra Excel' },

  // --- 8. DỊCH VỤ VIỄN THÔNG & CNTT (SERVICES) ---
  { code: 'services.view', name: 'Xem Danh sách Dịch vụ CNTT', module: 'services', description: 'Xem đường truyền Internet, tổng đài, cloud' },
  { code: 'services.create', name: 'Thêm mới Dịch vụ', module: 'services', description: 'Thêm hợp đồng dịch vụ viễn thông mới' },
  { code: 'services.update', name: 'Cập nhật Dịch vụ', module: 'services', description: 'Chỉnh sửa chi phí, ngày gia hạn dịch vụ' },
  { code: 'services.delete', name: 'Xóa Dịch vụ', module: 'services', description: 'Xóa hợp đồng dịch vụ viễn thông' },
  { code: 'services.renew', name: 'Thực hiện gia hạn hợp đồng dịch vụ', module: 'services', description: 'Gia hạn dịch vụ định kỳ' },
  { code: 'services.import', name: 'Import Dịch vụ từ Excel', module: 'services', description: 'Nhập dịch vụ từ file Excel' },
  { code: 'services.export', name: 'Export Báo cáo Dịch vụ IT', module: 'services', description: 'Xuất báo cáo hợp đồng dịch vụ' },

  // --- 9. KHO PHỤ TÙNG & LINH KIỆN (SPARE PARTS) ---
  { code: 'spare_parts.view', name: 'Xem Tồn kho Phụ tùng', module: 'spare_parts', description: 'Xem danh sách RAM, SSD, sạc dự phòng' },
  { code: 'spare_parts.manage', name: 'Quản lý & Nhập/Xuất Kho', module: 'spare_parts', description: 'Tạo phiếu nhập xuất kho linh kiện thay thế' },

  // --- 10. HÓA ĐƠN, CHỨNG TỪ & HỢP ĐỒNG (DOCUMENTS) ---
  { code: 'documents.view', name: 'Xem Tài liệu & Hợp đồng', module: 'documents', description: 'Xem file scan hóa đơn, biên bản bàn giao' },
  { code: 'documents.upload', name: 'Tải lên Tài liệu', module: 'documents', description: 'Upload file PDF hợp đồng, biên bản' },
  { code: 'documents.delete', name: 'Xóa Tài liệu', module: 'documents', description: 'Xóa chứng từ khỏi kho lưu trữ' },

  // --- 11. SỰ CỐ & VẤN ĐỀ IT (ITSM INCIDENTS & PROBLEMS) ---
  { code: 'incidents.view', name: 'Xem Sự cố IT (Incidents)', module: 'incidents', description: 'Xem các sự cố diện rộng P1/P2' },
  { code: 'incidents.manage', name: 'Quản lý & Điều phối Sự cố', module: 'incidents', description: 'Công bố và đóng sự cố gián đoạn dịch vụ' },
  { code: 'problems.view', name: 'Xem Quản lý Vấn đề (Problems)', module: 'problems', description: 'Xem phân tích nguyên nhân gốc rễ (RCA)' },
  { code: 'problems.manage', name: 'Quản lý Vấn đề & Giải pháp', module: 'problems', description: 'Tạo và cập nhật giải pháp triệt để cho sự cố lặp lại' },

  // --- 12. KHO MẬT KHẨU BẢO MẬT (PASSWORD VAULT) ---
  { code: 'passwords.view', name: 'Xem Kho Mật khẩu (Theo quyền)', module: 'passwords', description: 'Xem mật khẩu tài khoản dùng chung được chia sẻ' },
  { code: 'passwords.manage', name: 'Quản lý & Phân quyền Mật khẩu', module: 'passwords', description: 'Thêm mới, sửa và chia sẻ mật khẩu máy chủ/dịch vụ' },

  // --- 13. DANH MỤC MASTER DATA ---
  { code: 'categories.view', name: 'Xem Danh mục Thiết bị', module: 'categories', description: 'Xem cây danh mục tài sản' },
  { code: 'categories.create', name: 'Thêm Danh mục', module: 'categories', description: 'Tạo nhóm danh mục mới' },
  { code: 'categories.update', name: 'Sửa Danh mục', module: 'categories', description: 'Đổi tên, icon danh mục' },
  { code: 'categories.delete', name: 'Xóa Danh mục', module: 'categories', description: 'Xóa nhóm danh mục' },
  { code: 'vendors.view', name: 'Xem Nhà cung cấp', module: 'vendors', description: 'Xem đối tác cung ứng thiết bị' },
  { code: 'vendors.create', name: 'Thêm Nhà cung cấp', module: 'vendors', description: 'Khai báo đối tác mới' },
  { code: 'vendors.update', name: 'Sửa Nhà cung cấp', module: 'vendors', description: 'Cập nhật thông tin liên hệ NCC' },
  { code: 'vendors.delete', name: 'Xóa Nhà cung cấp', module: 'vendors', description: 'Xóa đối tác' },
  { code: 'locations.view', name: 'Xem Vị trí & Phòng ban', module: 'locations', description: 'Xem sơ đồ tòa nhà, chi nhánh' },
  { code: 'locations.create', name: 'Thêm Vị trí', module: 'locations', description: 'Khai báo văn phòng mới' },
  { code: 'locations.update', name: 'Sửa Vị trí', module: 'locations', description: 'Cập nhật tầng, tòa nhà' },
  { code: 'locations.delete', name: 'Xóa Vị trí', module: 'locations', description: 'Xóa địa điểm' },
  { code: 'companies.view', name: 'Xem Công ty thành viên', module: 'companies', description: 'Xem danh sách công ty thành viên' },
  { code: 'companies.create', name: 'Thêm Công ty thành viên', module: 'companies', description: 'Khai báo công ty thành viên mới' },
  { code: 'companies.update', name: 'Sửa Công ty thành viên', module: 'companies', description: 'Cập nhật công ty thành viên' },
  { code: 'companies.delete', name: 'Xóa Công ty thành viên', module: 'companies', description: 'Xóa công ty thành viên' },

  // --- 14. NGƯỜI DÙNG & PHÂN QUYỀN (USERS & RBAC) ---
  { code: 'users.view', name: 'Xem Danh sách Nhân sự', module: 'users', description: 'Xem danh sách tài khoản người dùng' },
  { code: 'users.create', name: 'Tạo mới Tài khoản', module: 'users', description: 'Tạo tài khoản nhân viên mới' },
  { code: 'users.update', name: 'Sửa Thông tin Tài khoản', module: 'users', description: 'Cập nhật phòng ban, chức vụ, mật khẩu' },
  { code: 'users.delete', name: 'Khóa / Xóa Tài khoản', module: 'users', description: 'Vô hiệu hóa tài khoản khi nghỉ việc' },
  { code: 'users.permissions', name: 'Phân quyền Chi tiết (RBAC)', module: 'users', description: 'Tùy chỉnh phân quyền theo vai trò và từng người' },

  // --- 15. TRỢ LÝ IT ẢO & AI ---
  { code: 'ai.chat', name: 'Sử dụng Trợ lý IT Ảo', module: 'ai', description: 'Trò chuyện và hỏi đáp sự cố với AI' },
  { code: 'ai.extract', name: 'AI Trích xuất OCR Tem/Hóa đơn', module: 'ai', description: 'Sử dụng AI đọc ảnh tem serial và hóa đơn tự động' },
  { code: 'ai.auto_save', name: 'AI Tự động Lưu Dữ liệu', module: 'ai', description: 'Cho phép AI tự động lưu tài sản khi tự tin cao' },
  { code: 'ai.templates.manage', name: 'Quản lý AI Prompts & Templates', module: 'ai', description: 'Cấu hình mẫu prompt AI và phân quyền AI' },

  // --- 16. BÁO CÁO & THỐNG KÊ (REPORTS) ---
  { code: 'reports.view', name: 'Xem Báo cáo Tổng hợp', module: 'reports', description: 'Xem báo cáo chi phí, tỷ lệ sự cố, khấu hao' },
  { code: 'reports.export', name: 'Export Báo cáo Thống kê', module: 'reports', description: 'Xuất file báo cáo tài sản ra Excel' },

  // --- 17. CÀI ĐẶT & HỆ THỐNG ---
  { code: 'settings.view', name: 'Xem Cài đặt Hệ thống', module: 'settings', description: 'Xem các thông số cấu hình chung' },
  { code: 'settings.update', name: 'Sửa Cấu hình Hệ thống', module: 'settings', description: 'Chỉnh sửa cấu hình Email, Backup, SSO, Phân tuyến' },
  { code: 'settings.backup', name: 'Sao lưu & Phục hồi Dữ liệu', module: 'settings', description: 'Chạy sao lưu thủ công hoặc restore cơ sở dữ liệu' },
  { code: 'settings.ldap', name: 'Cấu hình LDAP / Active Directory', module: 'settings', description: 'Kết nối và đồng bộ người dùng Active Directory' },
  { code: 'audit.view', name: 'Xem Nhật ký Hoạt động (Audit Log)', module: 'audit', description: 'Kiểm tra lịch sử thao tác của toàn bộ người dùng' },
];

// ==================== 3. CÁC VAI TRÒ MẶC ĐỊNH (SYSTEM ROLES) ====================
export const DEFAULT_ROLES: DefaultRole[] = [
  {
    name: 'Super Admin',
    description: 'Quản trị viên Tối cao - Toàn quyền tuyệt đối hệ thống, nắm giữ cấu hình gốc và phân cấp quyền',
    level: 100,
    isSystem: true,
  },
  {
    name: 'Admin',
    description: 'Quản trị viên Hệ thống - Toàn quyền vận hành, quản trị tài sản, nhân sự và cấu hình nghiệp vụ',
    level: 80,
    isSystem: true,
  },
  {
    name: 'Asset Manager',
    description: 'Kỹ thuật viên IT & Quản lý Tài sản - Quản lý thiết bị, license, bảo trì, phụ tùng và ticket hỗ trợ',
    level: 50,
    isSystem: true,
  },
  {
    name: 'Staff',
    description: 'Nhân viên - Cổng tự phục vụ: Xem thiết bị cá nhân, tạo ticket hỗ trợ, xin cấp máy, đọc hướng dẫn',
    level: 10,
    isSystem: true,
  },
];

// Quyền hạn gán mặc định cho từng vai trò
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  // Super Admin: Sở hữu 100% tất cả quyền hạn
  'Super Admin': ['*'],

  // Admin: Sở hữu 100% tất cả quyền hạn vận hành
  'Admin': ['*'],

  // Asset Manager (Kỹ thuật viên & Quản lý IT)
  'Asset Manager': [
    'dashboard.view',
    'dashboard.export',
    'portal.view',
    'kb.view', 'kb.create', 'kb.update', 'kb.delete', 'kb.internal',
    'tickets.view', 'tickets.create', 'tickets.update', 'tickets.assign', 'tickets.sla', 'tickets.reports',
    'approvals.view', 'approvals.create', 'approvals.approve',
    'assets.view', 'assets.create', 'assets.update', 'assets.delete', 'assets.assign', 'assets.import', 'assets.export', 'assets.audit',
    'assets.maintenance.view', 'assets.maintenance.create', 'assets.maintenance.update', 'assets.maintenance.delete',
    'licenses.view', 'licenses.create', 'licenses.update', 'licenses.delete', 'licenses.assign', 'licenses.import', 'licenses.export',
    'services.view', 'services.create', 'services.update', 'services.renew', 'services.import', 'services.export',
    'spare_parts.view', 'spare_parts.manage',
    'documents.view', 'documents.upload',
    'incidents.view', 'incidents.manage',
    'problems.view', 'problems.manage',
    'passwords.view', 'passwords.manage',
    'categories.view', 'categories.create', 'categories.update',
    'vendors.view', 'vendors.create', 'vendors.update',
    'locations.view', 'locations.create', 'locations.update',
    'companies.view',
    'users.view',
    'ai.chat', 'ai.extract', 'ai.auto_save',
    'reports.view', 'reports.export',
  ],

  // Staff (Người dùng cuối thông thường)
  'Staff': [
    'portal.view',
    'dashboard.view',
    'kb.view',
    'tickets.view',
    'tickets.create',
    'approvals.view',
    'approvals.create',
    'assets.view',
    'ai.chat',
  ],
};

// ==================== 4. TỰ ĐỘNG KHỞI TẠO VÀ ĐỒNG BỘ RBAC TRONG CSDL ====================
let _isEnsured = false;

/**
 * Đảm bảo CSDL luôn có đầy đủ Roles, Permissions và Super Admin mặc định.
 * Hàm này chạy tự động và idempotency (không ghi đè dữ liệu tùy biến hiện có).
 */
export async function ensureDefaultRolesAndPermissions(prisma: PrismaClient): Promise<void> {
  if (_isEnsured) return;

  try {
    // 1. Đồng bộ permissions mặc định
    for (const p of DEFAULT_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, module: p.module, description: p.description },
        create: p,
      });
    }

    // 2. Đồng bộ các roles hệ thống
    const createdRoles: Record<string, string> = {};
    for (const r of DEFAULT_ROLES) {
      const role = await prisma.role.upsert({
        where: { name: r.name },
        update: { description: r.description, isSystem: true },
        create: { name: r.name, description: r.description, isSystem: true },
      });
      createdRoles[r.name] = role.id;
    }

    // 3. Đảm bảo ma trận phân quyền cơ bản cho các roles
    const allDbPerms = await prisma.permission.findMany();
    const permMap = new Map(allDbPerms.map((p) => [p.code, p.id]));

    for (const [roleName, permCodes] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
      const roleId = createdRoles[roleName];
      if (!roleId) continue;

      if (permCodes.includes('*')) {
        // Gán tất cả permissions
        for (const p of allDbPerms) {
          await prisma.rolePermission.upsert({
            where: { roleId_permissionId: { roleId, permissionId: p.id } },
            update: {},
            create: { roleId, permissionId: p.id },
          });
        }
      } else {
        // Gán permissions theo danh sách
        for (const code of permCodes) {
          const permId = permMap.get(code);
          if (permId) {
            await prisma.rolePermission.upsert({
              where: { roleId_permissionId: { roleId, permissionId: permId } },
              update: {},
              create: { roleId, permissionId: permId },
            });
          }
        }
      }
    }

    // 4. Đảm bảo có ít nhất 1 Super Admin trong hệ thống
    const superAdminRole = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    if (superAdminRole) {
      const existingSuperAdmin = await prisma.user.findFirst({
        where: { roleId: superAdminRole.id },
      });

      if (!existingSuperAdmin) {
        // Nâng cấp tài khoản admin đầu tiên (ví dụ admin@company.com) thành Super Admin
        const defaultAdmin = await prisma.user.findFirst({
          where: {
            OR: [
              { email: 'admin@company.com' },
              { role: { name: 'Admin' } },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });

        if (defaultAdmin) {
          await prisma.user.update({
            where: { id: defaultAdmin.id },
            data: { roleId: superAdminRole.id },
          });
          console.log(`[RBAC] Đã nâng cấp tài khoản '${defaultAdmin.email}' thành Super Admin.`);
        }
      }
    }

    _isEnsured = true;
  } catch (err) {
    console.error('[RBAC] Lỗi khi đồng bộ cấu hình Roles & Permissions mặc định:', err);
  }
}
