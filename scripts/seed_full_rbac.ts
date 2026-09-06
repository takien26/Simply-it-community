import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛡️ Đang cấu hình và đồng bộ toàn diện Hệ Thống Phân Quyền (RBAC)...');

  // ==================== 1. DANH MỤC QUYỀN HẠN ĐẦY ĐỦ THEO PHÂN HỆ ====================
  const fullPermissions = [
    // --- 1. DASHBOARD & TỔNG QUAN ---
    { code: 'dashboard.view', name: 'Xem Dashboard Tổng quan', module: 'dashboard', description: 'Cho phép truy cập và xem trang chủ Dashboard' },
    { code: 'dashboard.export', name: 'Xuất Báo cáo Dashboard', module: 'dashboard', description: 'Xuất dữ liệu thống kê tổng quan ra Excel/PDF' },

    // --- 2. HƯỚNG DẪN & TRI THỨC IT (KNOWLEDGE BASE) ---
    { code: 'kb.view', name: 'Xem Hướng dẫn IT (Public)', module: 'kb', description: 'Cho phép xem cẩm nang hướng dẫn sử dụng, xử lý sự cố cơ bản (Dành cho mọi nhân viên)' },
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

    // --- 14. NGƯỜI DÙNG & PHÂN QUYỀN (USERS & RBAC) ---
    { code: 'users.view', name: 'Xem Danh sách Nhân sự', module: 'users', description: 'Xem danh sách tài khoản người dùng' },
    { code: 'users.create', name: 'Tạo mới Tài khoản', module: 'users', description: 'Tạo tài khoản nhân viên mới' },
    { code: 'users.update', name: 'Sửa Thông tin Tài khoản', module: 'users', description: 'Cập nhật phòng ban, chức vụ, mật khẩu' },
    { code: 'users.delete', name: 'Khóa / Xóa Tài khoản', module: 'users', description: 'Vô hiệu hóa tài khoản khi nghỉ việc' },
    { code: 'users.permissions', name: 'Phân quyền Chi tiết (RBAC)', module: 'users', description: 'Tùy chỉnh phân quyền theo vai trò và từng người' },

    // --- 15. TRỢ LÝ IT ẢO & TRÍ TUỆ NHÂN TẠO (AI) ---
    { code: 'ai.chat', name: 'Sử dụng Trợ lý IT Ảo', module: 'ai', description: 'Trò chuyện và hỏi đáp sự cố với AI' },
    { code: 'ai.extract', name: 'AI Trích xuất OCR Tem/Hóa đơn', module: 'ai', description: 'Sử dụng AI đọc ảnh tem serial và hóa đơn tự động' },
    { code: 'ai.auto_save', name: 'AI Tự động Lưu Dữ liệu', module: 'ai', description: 'Cho phép AI tự động lưu tài sản khi tự tin cao' },
    { code: 'ai.templates.manage', name: 'Quản lý AI Prompts & Templates', module: 'ai', description: 'Cấu hình mẫu prompt AI và phân quyền AI' },
    { code: 'ai.all_scope', name: 'AI Truy xuất Toàn Bộ Dữ liệu IT', module: 'ai', description: 'Cho phép AI trả lời cả các cấu hình máy chủ, VLAN nội bộ IT' },

    // --- 16. BÁO CÁO & THỐNG KÊ (REPORTS) ---
    { code: 'reports.view', name: 'Xem Báo cáo Tổng hợp', module: 'reports', description: 'Xem báo cáo chi phí, tỷ lệ sự cố, khấu hao' },
    { code: 'reports.export', name: 'Export Báo cáo Thống kê', module: 'reports', description: 'Xuất file báo cáo tài sản ra Excel' },

    // --- 17. CÀI ĐẶT & HỆ THỐNG ---
    { code: 'settings.view', name: 'Xem Cài đặt Hệ thống', module: 'settings', description: 'Xem các thông số cấu hình chung' },
    { code: 'settings.update', name: 'Sửa Cấu hình Hệ thống', module: 'settings', description: 'Chỉnh sửa cấu hình Email, Backup, SSO, Phân tuyến' },
    { code: 'settings.backup', name: 'Sao lưu & Phục hồi Dữ liệu', module: 'settings', description: 'Chạy sao lưu thủ công hoặc restore cơ sở dữ liệu' },
    { code: 'audit.view', name: 'Xem Nhật ký Hoạt động (Audit Log)', module: 'audit', description: 'Kiểm tra lịch sử thao tác của toàn bộ người dùng' },
  ];

  for (const p of fullPermissions) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, module: p.module, description: p.description },
      create: p,
    });
  }
  console.log(`✅ Đã đồng bộ ${fullPermissions.length} quyền hạn chi tiết trong CSDL`);

  // ==================== 2. CHUẨN HÓA 3 VAI TRÒ CHÍNH (ROLES) ====================

  // 1. ADMIN (Toàn quyền 100%)
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: { description: 'Quản trị viên Hệ thống - Toàn quyền quản lý và cấu hình', isSystem: true },
    create: { name: 'Admin', description: 'Quản trị viên Hệ thống - Toàn quyền quản lý và cấu hình', isSystem: true },
  });

  // 2. ASSET MANAGER / IT SPECIALIST (Kỹ thuật viên & Quản lý IT)
  const itManagerRole = await prisma.role.upsert({
    where: { name: 'Asset Manager' },
    update: { description: 'Kỹ thuật viên IT & Quản trị viên Tài sản', isSystem: true },
    create: { name: 'Asset Manager', description: 'Kỹ thuật viên IT & Quản trị viên Tài sản', isSystem: true },
  });

  // 3. STAFF / USER (Nhân viên thông thường)
  const staffRole = await prisma.role.upsert({
    where: { name: 'Staff' },
    update: { description: 'Nhân viên công ty - Xem tài sản được cấp, tạo ticket hỗ trợ & đọc tài liệu hướng dẫn', isSystem: true },
    create: { name: 'Staff', description: 'Nhân viên công ty - Xem tài sản được cấp, tạo ticket hỗ trợ & đọc tài liệu hướng dẫn', isSystem: true },
  });

  // ==================== 3. GÁN QUYỀN CHO CÁC VAI TRÒ ====================
  const allDbPerms = await prisma.permission.findMany();

  // 1. ADMIN -> Gán FULL 100% quyền
  for (const perm of allDbPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }
  console.log('✅ Admin: Đã gán toàn bộ 100% quyền');

  // 2. IT SPECIALIST / ASSET MANAGER -> Gán các quyền IT chuyên nghiệp
  const itExcludedCodes = ['settings.backup', 'users.permissions']; // Các quyền siêu nhạy cảm chỉ Super Admin mới có
  await prisma.rolePermission.deleteMany({ where: { roleId: itManagerRole.id } });
  for (const perm of allDbPerms) {
    if (!itExcludedCodes.includes(perm.code)) {
      await prisma.rolePermission.create({
        data: { roleId: itManagerRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('✅ Asset Manager / IT: Đã gán quyền vận hành IT & kỹ thuật đầy đủ');

  // 3. STAFF / USER -> Gán quyền cơ bản của Người dùng cuối
  const staffCodes = [
    'dashboard.view',      // Xem tổng quan
    'kb.view',             // Đọc bài viết hướng dẫn IT công khai
    'tickets.create',      // Tạo yêu cầu hỗ trợ
    'tickets.view',        // Xem tiến độ ticket của mình
    'approvals.create',    // Xin cấp phát laptop/máy tính mới
    'approvals.view',      // Xem đơn xin cấp máy của mình
    'assets.view',         // Xem thiết bị đang bàn giao cho mình
    'ai.chat',             // Trò chuyện giải đáp lỗi với Trợ lý IT ảo
  ];

  await prisma.rolePermission.deleteMany({ where: { roleId: staffRole.id } });
  for (const perm of allDbPerms) {
    if (staffCodes.includes(perm.code)) {
      await prisma.rolePermission.create({
        data: { roleId: staffRole.id, permissionId: perm.id },
      });
    }
  }
  console.log('✅ Staff / User: Đã gán 8 quyền cốt lõi (Đọc hướng dẫn, Tạo ticket, Xin cấp máy, Xem máy cá nhân, Chat AI)');

  console.log('🎉 Hoàn tất chuẩn hóa Hệ Thống Phân Quyền RBAC!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
