import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ============ PERMISSIONS ============
  const permissionsData = [
    {
        "code": "portal.view",
        "name": "Xem Cổng tự phục vụ nhân viên",
        "module": "portal"
    },
    {
        "code": "dashboard.view",
        "name": "Xem Bảng điều khiển & Thống kê",
        "module": "dashboard"
    },
    {
        "code": "assets.view",
        "name": "Xem danh sách thiết bị / tài sản",
        "module": "assets"
    },
    {
        "code": "assets.create",
        "name": "Thêm mới thiết bị / tài sản",
        "module": "assets"
    },
    {
        "code": "assets.update",
        "name": "Sửa thông tin thiết bị",
        "module": "assets"
    },
    {
        "code": "assets.delete",
        "name": "Xóa / Hủy thiết bị",
        "module": "assets"
    },
    {
        "code": "assets.assign",
        "name": "Bàn giao / Thu hồi thiết bị cho nhân viên",
        "module": "assets"
    },
    {
        "code": "assets.import",
        "name": "Import danh sách thiết bị từ Excel",
        "module": "assets"
    },
    {
        "code": "assets.export",
        "name": "Export danh sách thiết bị ra Excel",
        "module": "assets"
    },
    {
        "code": "assets.maintenance.view",
        "name": "Xem lịch sử sửa chữa & bảo trì",
        "module": "assets.maintenance"
    },
    {
        "code": "assets.maintenance.create",
        "name": "Tạo phiếu sửa chữa / bảo trì mới",
        "module": "assets.maintenance"
    },
    {
        "code": "assets.maintenance.update",
        "name": "Cập nhật tiến độ & chi phí sửa chữa",
        "module": "assets.maintenance"
    },
    {
        "code": "assets.maintenance.delete",
        "name": "Xóa phiếu sửa chữa / bảo trì",
        "module": "assets.maintenance"
    },
    {
        "code": "licenses.view",
        "name": "Xem danh sách bản quyền License",
        "module": "licenses"
    },
    {
        "code": "licenses.create",
        "name": "Thêm mới bản quyền License",
        "module": "licenses"
    },
    {
        "code": "licenses.update",
        "name": "Sửa License & cập nhật key",
        "module": "licenses"
    },
    {
        "code": "licenses.delete",
        "name": "Xóa bản quyền License",
        "module": "licenses"
    },
    {
        "code": "licenses.assign",
        "name": "Cấp phát / Thu hồi License cho nhân viên",
        "module": "licenses"
    },
    {
        "code": "licenses.import",
        "name": "Import License từ Excel",
        "module": "licenses"
    },
    {
        "code": "licenses.export",
        "name": "Export danh sách License",
        "module": "licenses"
    },
    {
        "code": "services.view",
        "name": "Xem danh sách dịch vụ IT & thuê bao",
        "module": "services"
    },
    {
        "code": "services.create",
        "name": "Thêm mới dịch vụ IT / đường truyền / VPS",
        "module": "services"
    },
    {
        "code": "services.update",
        "name": "Sửa dịch vụ & chu kỳ thanh toán",
        "module": "services"
    },
    {
        "code": "services.delete",
        "name": "Xóa dịch vụ IT",
        "module": "services"
    },
    {
        "code": "services.renew",
        "name": "Thực hiện gia hạn hợp đồng dịch vụ",
        "module": "services"
    },
    {
        "code": "services.import",
        "name": "Import dịch vụ từ Excel",
        "module": "services"
    },
    {
        "code": "services.export",
        "name": "Export báo cáo dịch vụ IT",
        "module": "services"
    },
    {
        "code": "tickets.view",
        "name": "Xem danh sách Ticket hỗ trợ IT",
        "module": "tickets"
    },
    {
        "code": "tickets.create",
        "name": "Tạo mới Ticket yêu cầu hỗ trợ",
        "module": "tickets"
    },
    {
        "code": "tickets.update",
        "name": "Tiếp nhận & cập nhật trạng thái Ticket",
        "module": "tickets"
    },
    {
        "code": "tickets.delete",
        "name": "Xóa / Hủy Ticket hỗ trợ",
        "module": "tickets"
    },
    {
        "code": "tickets.assign",
        "name": "Phân công KTV xử lý Ticket",
        "module": "tickets"
    },
    {
        "code": "tickets.comment",
        "name": "Trao đổi & phản hồi nội bộ trên Ticket",
        "module": "tickets"
    },
    {
        "code": "documents.view",
        "name": "Xem hồ sơ, hóa đơn & hợp đồng",
        "module": "documents"
    },
    {
        "code": "documents.create",
        "name": "Tải lên hồ sơ / hóa đơn mới",
        "module": "documents"
    },
    {
        "code": "documents.update",
        "name": "Chỉnh sửa thông tin hồ sơ & liên kết",
        "module": "documents"
    },
    {
        "code": "documents.delete",
        "name": "Xóa hồ sơ / hóa đơn",
        "module": "documents"
    },
    {
        "code": "documents.download",
        "name": "Tải tệp đính kèm gốc",
        "module": "documents"
    },
    {
        "code": "categories.view",
        "name": "Xem danh mục thiết bị, lic & dịch vụ",
        "module": "categories"
    },
    {
        "code": "categories.create",
        "name": "Thêm mới danh mục",
        "module": "categories"
    },
    {
        "code": "categories.update",
        "name": "Sửa danh mục & cấu hình trường thông số",
        "module": "categories"
    },
    {
        "code": "categories.delete",
        "name": "Xóa danh mục",
        "module": "categories"
    },
    {
        "code": "vendors.view",
        "name": "Xem danh bạ đối tác / nhà cung cấp",
        "module": "vendors"
    },
    {
        "code": "vendors.create",
        "name": "Thêm mới nhà cung cấp",
        "module": "vendors"
    },
    {
        "code": "vendors.update",
        "name": "Sửa nhà cung cấp & danh bạ liên hệ",
        "module": "vendors"
    },
    {
        "code": "vendors.delete",
        "name": "Xóa nhà cung cấp",
        "module": "vendors"
    },
    {
        "code": "locations.view",
        "name": "Xem vị trí / phòng ban",
        "module": "locations"
    },
    {
        "code": "locations.create",
        "name": "Thêm vị trí mới",
        "module": "locations"
    },
    {
        "code": "locations.update",
        "name": "Sửa thông tin vị trí / tòa nhà",
        "module": "locations"
    },
    {
        "code": "locations.delete",
        "name": "Xóa vị trí",
        "module": "locations"
    },
    {
        "code": "companies.view",
        "name": "Xem công ty thành viên & chi nhánh",
        "module": "companies"
    },
    {
        "code": "companies.create",
        "name": "Thêm mới công ty thành viên",
        "module": "companies"
    },
    {
        "code": "companies.update",
        "name": "Sửa thông tin công ty",
        "module": "companies"
    },
    {
        "code": "companies.delete",
        "name": "Xóa công ty thành viên",
        "module": "companies"
    },
    {
        "code": "users.view",
        "name": "Xem danh sách tài khoản",
        "module": "users"
    },
    {
        "code": "users.create",
        "name": "Tạo tài khoản người dùng mới",
        "module": "users"
    },
    {
        "code": "users.update",
        "name": "Chỉnh sửa tài khoản & reset mật khẩu",
        "module": "users"
    },
    {
        "code": "users.delete",
        "name": "Khóa / Xóa tài khoản người dùng",
        "module": "users"
    },
    {
        "code": "users.permissions",
        "name": "Cấu hình phân quyền vai trò & người dùng",
        "module": "users"
    },
    {
        "code": "settings.view",
        "name": "Xem cài đặt hệ thống",
        "module": "settings"
    },
    {
        "code": "settings.update",
        "name": "Sửa đổi cấu hình chung & giao diện",
        "module": "settings"
    },
    {
        "code": "settings.ldap",
        "name": "Cấu hình xác thực LDAP / Active Directory",
        "module": "settings"
    },
    {
        "code": "reports.view",
        "name": "Xem báo cáo thống kê tổng hợp",
        "module": "reports"
    },
    {
        "code": "reports.export",
        "name": "Xuất dữ liệu báo cáo (Excel/PDF)",
        "module": "reports"
    },
    {
        "code": "audit.view",
        "name": "Xem nhật ký hoạt động hệ thống (Audit Log)",
        "module": "audit"
    },
    {
        "code": "ai.extract",
        "name": "Sử dụng AI OCR / Trích xuất tài liệu",
        "module": "ai"
    },
    {
        "code": "ai.auto_save",
        "name": "Cho phép AI tự động lưu dữ liệu trích xuất",
        "module": "ai"
    },
    {
        "code": "ai.templates.manage",
        "name": "Quản lý các mẫu Template & Prompt AI",
        "module": "ai"
    },
    {
        "code": "ai.history.view",
        "name": "Xem lịch sử trích xuất AI",
        "module": "ai"
    },
    // Incidents & Problems
    {
        "code": "incidents.view",
        "name": "Xem danh sách Sự cố & Vấn đề",
        "module": "incidents"
    },
    {
        "code": "incidents.create",
        "name": "Tạo Sự cố / Vấn đề mới",
        "module": "incidents"
    },
    {
        "code": "incidents.update",
        "name": "Cập nhật tiến độ & Nguyên nhân sự cố",
        "module": "incidents"
    },
    {
        "code": "incidents.delete",
        "name": "Xóa Sự cố / Vấn đề",
        "module": "incidents"
    },
    // Knowledge Base / Hướng dẫn
    {
        "code": "kb.view",
        "name": "Xem Hướng dẫn & Tài liệu IT",
        "module": "kb"
    },
    {
        "code": "kb.create",
        "name": "Tạo bài viết Hướng dẫn mới",
        "module": "kb"
    },
    {
        "code": "kb.update",
        "name": "Chỉnh sửa bài viết Hướng dẫn",
        "module": "kb"
    },
    {
        "code": "kb.delete",
        "name": "Xóa bài viết Hướng dẫn",
        "module": "kb"
    },
    // Ticket Reports
    {
        "code": "tickets.reports",
        "name": "Xem Báo cáo & Thống kê Ticket",
        "module": "reports"
    }
];

  const permissions = await Promise.all(
    permissionsData.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: {},
        create: p,
      })
    )
  );

  console.log(`✅ Created ${permissions.length} permissions`);

  // ============ ROLES ============
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Quản trị viên hệ thống - Toàn quyền',
      isSystem: true,
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: 'Asset Manager' },
    update: {},
    create: {
      name: 'Asset Manager',
      description: 'Quản lý tài sản & license',
      isSystem: true,
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'Staff' },
    update: {},
    create: {
      name: 'Staff',
      description: 'Nhân viên - Xem tài sản/license được gán',
      isSystem: true,
    },
  });

  console.log('✅ Created roles: Admin, Asset Manager, Staff');

  // ============ ROLE PERMISSIONS ============
  // Admin gets ALL permissions
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    });
  }

  // Asset Manager permissions
  const managerPermCodes = [
    'dashboard.view',
    'assets.view', 'assets.create', 'assets.update', 'assets.delete', 'assets.assign', 'assets.import', 'assets.export',
    'assets.maintenance.view', 'assets.maintenance.create', 'assets.maintenance.update', 'assets.maintenance.delete',
    'licenses.view', 'licenses.create', 'licenses.update', 'licenses.delete', 'licenses.assign', 'licenses.import', 'licenses.export',
    'categories.view', 'categories.create', 'categories.update', 'categories.delete',
    'vendors.view', 'vendors.create', 'vendors.update', 'vendors.delete',
    'locations.view', 'locations.create', 'locations.update', 'locations.delete',
    'reports.view', 'reports.export',
    'ai.extract', 'ai.auto_save', 'ai.history.view',
  ];

  for (const code of managerPermCodes) {
    const perm = permissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: managerRole.id, permissionId: perm.id },
      });
    }
  }

  // Staff permissions (Streamlined Self-Service)
  const staffPermCodes = ['portal.view', 'kb.view', 'tickets.view', 'tickets.create', 'approvals.create', 'ai.chat'];

  for (const code of staffPermCodes) {
    const perm = permissions.find((p) => p.code === code);
    if (perm) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: staffRole.id, permissionId: perm.id } },
        update: {},
        create: { roleId: staffRole.id, permissionId: perm.id },
      });
    }
  }

  console.log('✅ Assigned permissions to roles');

  // ============ ADMIN USER ============
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      passwordHash: hashedPassword,
      fullName: 'System Admin',
      roleId: adminRole.id,
      department: 'IT',
      isActive: true,
    },
  });

  console.log('✅ Created admin user: admin@company.com / Admin@123');

  // ============ ASSET CATEGORIES ============
  const categories = [
    { name: 'Thiết bị văn phòng', icon: '🏢', children: [
      { name: 'Laptop', icon: '💻' },
      { name: 'PC / Máy tính để bàn', icon: '🖥️' },
      { name: 'Màn hình', icon: '🖥️' },
      { name: 'Bàn phím & Chuột', icon: '⌨️' },
      { name: 'Máy in', icon: '🖨️' },
    ]},
    { name: 'Thiết bị mạng', icon: '🌐', children: [
      { name: 'Router', icon: '📡' },
      { name: 'Switch', icon: '🔌' },
      { name: 'Access Point', icon: '📶' },
    ]},
    { name: 'Thiết bị di động', icon: '📱', children: [
      { name: 'Điện thoại', icon: '📱' },
      { name: 'Tablet', icon: '📋' },
    ]},
    { name: 'Phụ kiện', icon: '🔧', children: [
      { name: 'Adapter / Sạc', icon: '🔌' },
      { name: 'USB / Thiết bị lưu trữ', icon: '💾' },
      { name: 'Tai nghe / Loa', icon: '🎧' },
    ]},
  ];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    let parent = await prisma.assetCategory.findFirst({
      where: { name: cat.name, parentId: null },
    });
    if (!parent) {
      parent = await prisma.assetCategory.create({
        data: { name: cat.name, icon: cat.icon, sortOrder: i },
      });
    }

    if (cat.children) {
      for (let j = 0; j < cat.children.length; j++) {
        const child = cat.children[j];
        const existingChild = await prisma.assetCategory.findFirst({
          where: { name: child.name, parentId: parent.id },
        });
        if (!existingChild) {
          await prisma.assetCategory.create({
            data: {
              name: child.name,
              icon: child.icon,
              parentId: parent.id,
              sortOrder: j,
            },
          });
        }
      }
    }
  }

  console.log('✅ Created asset categories');

  // ============ LOCATIONS ============
  const locations = [
    { name: 'Phòng IT', building: 'Tòa A', floor: 'Tầng 3' },
    { name: 'Phòng Kế toán', building: 'Tòa A', floor: 'Tầng 2' },
    { name: 'Phòng Kinh doanh', building: 'Tòa A', floor: 'Tầng 4' },
    { name: 'Phòng Nhân sự', building: 'Tòa A', floor: 'Tầng 2' },
    { name: 'Phòng họp lớn', building: 'Tòa A', floor: 'Tầng 1' },
    { name: 'Kho thiết bị', building: 'Tòa B', floor: 'Tầng 1' },
  ];

  for (const loc of locations) {
    const existing = await prisma.location.findFirst({ where: { name: loc.name } });
    if (!existing) {
      await prisma.location.create({ data: loc });
    }
  }

  console.log('✅ Created locations');

  // ============ SYSTEM SETTINGS ============
  const settings = [
    { key: 'app.name', value: 'IT Asset Manager', type: 'STRING' as const, group: 'general', label: 'Tên ứng dụng' },
    { key: 'app.company_name', value: 'Công ty ABC', type: 'STRING' as const, group: 'general', label: 'Tên công ty' },
    { key: 'app.logo', value: '/images/logo.png', type: 'IMAGE_URL' as const, group: 'appearance', label: 'Logo' },
    { key: 'app.favicon', value: '/favicon.ico', type: 'IMAGE_URL' as const, group: 'appearance', label: 'Favicon' },
    { key: 'app.primary_color', value: '#2563EB', type: 'STRING' as const, group: 'appearance', label: 'Màu chủ đạo' },
    { key: 'app.language', value: 'vi', type: 'STRING' as const, group: 'general', label: 'Ngôn ngữ mặc định' },
    { key: 'notification.license_expiry_days', value: '30', type: 'NUMBER' as const, group: 'notification', label: 'Cảnh báo license trước (ngày)' },
    { key: 'notification.warranty_expiry_days', value: '30', type: 'NUMBER' as const, group: 'notification', label: 'Cảnh báo bảo hành trước (ngày)' },
    { key: 'ai.auto_save_threshold', value: '0.85', type: 'NUMBER' as const, group: 'ai', label: 'Ngưỡng AI tự động lưu' },
    { key: 'ai.provider', value: 'gemini', type: 'STRING' as const, group: 'ai', label: 'AI Provider' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log('✅ Created system settings');

  // ============ AI EXTRACTION TEMPLATES ============
  const templates = [
    {
      name: 'Tem Serial Thiết bị',
      targetEntity: 'ASSET' as const,
      description: 'Trích xuất thông tin từ ảnh tem serial/nhãn thiết bị',
      promptTemplate: 'Analyze this device label/serial tag image. Extract device information and return as JSON with these fields: {{expectedFields}}. If a field is not visible, set it to null. For specs, extract any visible hardware specifications (CPU, RAM, Storage, etc.).',
      expectedFields: {
        name: { type: 'string', label: 'Tên thiết bị', required: true },
        brand: { type: 'string', label: 'Thương hiệu', required: true },
        model: { type: 'string', label: 'Model' },
        serialNumber: { type: 'string', label: 'Serial Number', required: true },
        specs: { type: 'object', label: 'Cấu hình' },
      },
      exampleOutput: {
        name: 'Laptop Dell Latitude 5540',
        brand: 'Dell',
        model: 'Latitude 5540',
        serialNumber: 'ABC123XYZ',
        specs: { cpu: 'i7-1365U', ram: '16GB', ssd: '512GB' },
      },
    },
    {
      name: 'Hóa đơn / Invoice',
      targetEntity: 'ASSET' as const,
      description: 'Trích xuất thông tin mua hàng từ hóa đơn',
      promptTemplate: 'Analyze this invoice/receipt image. Extract purchase information for IT assets. Return as JSON with these fields: {{expectedFields}}. Convert prices to numbers (e.g. "25.000.000 VND" -> 25000000). Parse dates to ISO format.',
      expectedFields: {
        name: { type: 'string', label: 'Tên sản phẩm', required: true },
        brand: { type: 'string', label: 'Thương hiệu' },
        model: { type: 'string', label: 'Model' },
        serialNumber: { type: 'string', label: 'Serial Number' },
        purchaseDate: { type: 'date', label: 'Ngày mua' },
        purchasePrice: { type: 'number', label: 'Giá mua' },
        vendorName: { type: 'string', label: 'Nhà cung cấp' },
      },
    },
    {
      name: 'Hợp đồng License',
      targetEntity: 'LICENSE' as const,
      description: 'Trích xuất thông tin license từ PDF hợp đồng',
      promptTemplate: 'Analyze this license contract/document. Extract software license information. Return as JSON with these fields: {{expectedFields}}. Parse dates to ISO format. Convert prices to numbers.',
      expectedFields: {
        name: { type: 'string', label: 'Tên phần mềm', required: true },
        licenseKey: { type: 'string', label: 'License Key' },
        licenseType: { type: 'enum', label: 'Loại license', values: ['PERPETUAL', 'SUBSCRIPTION', 'OEM', 'TRIAL'] },
        totalSeats: { type: 'number', label: 'Số seat' },
        purchaseDate: { type: 'date', label: 'Ngày mua' },
        expiryDate: { type: 'date', label: 'Ngày hết hạn' },
        purchasePrice: { type: 'number', label: 'Giá mua' },
        vendorName: { type: 'string', label: 'Nhà cung cấp' },
      },
    },
    {
      name: 'Quick Text - Tài sản',
      targetEntity: 'ASSET' as const,
      description: 'Phân tích dòng text ngắn để tạo tài sản nhanh',
      promptTemplate: 'Parse this short text description of an IT asset. Extract as much information as possible. Convert Vietnamese price shorthand (e.g., "25tr" = 25000000, "5m" = 5000000). Parse any date formats. Text: "{{inputText}}"\n\nReturn JSON with fields: {{expectedFields}}',
      expectedFields: {
        name: { type: 'string', label: 'Tên thiết bị', required: true },
        brand: { type: 'string', label: 'Thương hiệu' },
        model: { type: 'string', label: 'Model' },
        serialNumber: { type: 'string', label: 'Serial Number' },
        purchaseDate: { type: 'date', label: 'Ngày mua' },
        purchasePrice: { type: 'number', label: 'Giá mua' },
        specs: { type: 'object', label: 'Cấu hình' },
      },
    },
    {
      name: 'Quick Text - License',
      targetEntity: 'LICENSE' as const,
      description: 'Phân tích dòng text ngắn để tạo license nhanh',
      promptTemplate: 'Parse this short text description of a software license. Extract as much information as possible. Convert Vietnamese price shorthand. Parse any date formats. Text: "{{inputText}}"\n\nReturn JSON with fields: {{expectedFields}}',
      expectedFields: {
        name: { type: 'string', label: 'Tên phần mềm', required: true },
        licenseKey: { type: 'string', label: 'License Key' },
        totalSeats: { type: 'number', label: 'Số seat' },
        expiryDate: { type: 'date', label: 'Ngày hết hạn' },
        purchasePrice: { type: 'number', label: 'Giá mua' },
      },
    },
  ];

  for (const tmpl of templates) {
    const existing = await prisma.aIExtractionTemplate.findFirst({ where: { name: tmpl.name } });
    if (!existing) {
      await prisma.aIExtractionTemplate.create({ data: tmpl });
    }
  }

  console.log('✅ Created AI extraction templates');

  console.log('\n🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
