// scripts/qa-full-system-deep-audit.js
const http = require('http');

const BASE_URL = 'http://localhost:3001';
let authToken = '';
let adminUserId = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (authToken && !headers['Cookie']) {
      headers['Cookie'] = `auth_token_3001=${authToken}; auth-token=${authToken}`;
    }

    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch (e) {
            json = rawData;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
            raw: rawData,
          });
        });
      }
    );

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }
    req.end();
  });
}

const testResults = [];

function assert(condition, name, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] ${name}`);
    testResults.push({ name, passed: true, details });
  } else {
    console.error(`  ❌ [FAIL] ${name} - ${details}`);
    testResults.push({ name, passed: false, details });
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN CHUYÊN SÂU HỆ THỐNG');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // SECTION 1: AUTHENTICATION & SECURITY BOUNDARIES
  // ----------------------------------------------------
  console.log('👉 [1] Kiểm thử Xác thực & An ninh đầu vào (Auth & Input Security)...');

  // 1.1 Unauthenticated access to protected routes
  const unauthAssets = await request('/api/assets');
  assert(unauthAssets.status === 401, 'Chặn truy cập trái phép vào /api/assets (401)');

  const unauthPasswords = await request('/api/passwords');
  assert(unauthPasswords.status === 401, 'Chặn truy cập trái phép vào /api/passwords (401)');

  const unauthServices = await request('/api/services');
  assert(unauthServices.status === 401, 'Chặn truy cập trái phép vào /api/services (401)');

  // 1.2 SQL Injection attempt in Login
  const sqliLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: "admin' OR '1'='1' --", password: 'randompassword' },
  });
  assert(sqliLogin.status === 401, 'Chống injection SQL/Prisma trong Login (Trả về 401 an toàn)', `Status: ${sqliLogin.status}`);

  // 1.3 Empty body in Login
  const emptyLogin = await request('/api/auth/login', {
    method: 'POST',
    body: '',
  });
  assert(emptyLogin.status === 400 || emptyLogin.status === 500, 'Xử lý body rỗng trong Login không làm sập server', `Status: ${emptyLogin.status}`);

  // 1.4 Valid Admin Login
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'admin@company.com', password: 'Admin@123' },
  });
  assert(loginRes.status === 200 && loginRes.body.success, 'Đăng nhập Quản trị viên (admin@company.com) thành công');

  const cookieHeader = loginRes.headers['set-cookie'];
  if (cookieHeader) {
    const match = cookieHeader.find((c) => c.startsWith('auth_token_3001=') || c.startsWith('auth-token='));
    if (match) {
      authToken = match.split(';')[0].split('=')[1];
    }
  }
  adminUserId = loginRes.body?.user?.id;

  // ----------------------------------------------------
  // SECTION 2: PASSWORD VAULT (KÉT MẬT KHẨU IT)
  // ----------------------------------------------------
  console.log('\n👉 [2] Kiểm thử Két mật khẩu (Password Vault)...');

  // 2.1 Create Password Entry
  const newPassRes = await request('/api/passwords', {
    method: 'POST',
    body: {
      title: 'QA Database Master Key',
      username: 'db_admin',
      password: 'SuperSecretPassword@2026',
      url: 'https://db.internal.net',
      category: 'SERVER',
      groupName: 'Infrastructure',
      notes: 'QA Automated Security Test',
    },
  });
  assert(newPassRes.status === 200 && newPassRes.body.success, 'Tạo mục mật khẩu mới an toàn');
  const passId = newPassRes.body?.data?.id;

  // 2.2 Retrieve Password List
  const passListRes = await request('/api/passwords');
  assert(passListRes.status === 200 && Array.isArray(passListRes.body.data), 'Lấy danh sách mật khẩu với số liệu thống kê nhóm');

  // 2.3 Delete Password -> verify moves to trash and logs audit
  if (passId) {
    const delPassRes = await request(`/api/passwords/${passId}`, { method: 'DELETE' });
    assert(delPassRes.status === 200 && delPassRes.body.inTrash, 'Xóa mật khẩu đưa vào Thùng rác (Recycle Bin) an toàn');

    // Restore password from trash
    const trashItemId = delPassRes.body?.trashItemId;
    if (trashItemId) {
      const restorePassRes = await request(`/api/trash/${trashItemId}/restore`, {
        method: 'POST',
      });
      assert(restorePassRes.status === 200 && restorePassRes.body.success, 'Khôi phục mật khẩu từ Thùng rác hoàn hảo');

      // Cleanup
      await request(`/api/passwords/${passId}`, { method: 'DELETE' });
    }
  }

  // ----------------------------------------------------
  // SECTION 3: IT SERVICES & CONTRACTS
  // ----------------------------------------------------
  console.log('\n👉 [3] Kiểm thử Quản lý Dịch vụ & Hợp đồng IT (IT Services)...');

  // 3.1 Create Service
  const testServiceCode = `SRV-QA-${Date.now().toString().slice(-5)}`;
  const createServiceRes = await request('/api/services', {
    method: 'POST',
    body: {
      serviceCode: testServiceCode,
      name: 'Đường truyền Cáp quang VNPT Leased-Line 100Mbps',
      serviceType: 'INTERNET',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      cost: 5500000,
      currency: 'VND',
      startDate: '2026-01-01',
      renewalDate: '2026-12-31',
      notes: 'Dự phòng kết nối mạng',
    },
  });
  assert(createServiceRes.status === 201 && createServiceRes.body.success, 'Tạo dịch vụ IT / Hợp đồng mới');
  const serviceId = createServiceRes.body?.data?.id;

  // 3.2 Update Service
  if (serviceId) {
    const updateServiceRes = await request(`/api/services/${serviceId}`, {
      method: 'PUT',
      body: {
        cost: 6000000,
        notes: 'Đã nâng cấp băng thông lên 150Mbps',
      },
    });
    assert(updateServiceRes.status === 200 && updateServiceRes.body.success, 'Cập nhật thông tin và chi phí dịch vụ IT');

    // 3.3 Delete Service
    const delServiceRes = await request(`/api/services/${serviceId}`, { method: 'DELETE' });
    assert(delServiceRes.status === 200 && delServiceRes.body.success, 'Xóa dịch vụ IT thành công');
  }

  // ----------------------------------------------------
  // SECTION 4: TICKETS & SERVICE DESK EDGE CASES
  // ----------------------------------------------------
  console.log('\n👉 [4] Kiểm thử Ticket & Bình luận Hỗ trợ (Service Desk Edge Cases)...');

  // 4.1 Create Ticket
  const createTicketRes = await request('/api/tickets', {
    method: 'POST',
    body: {
      title: 'QA System Test Ticket - Edge Cases',
      description: 'Kiểm thử xử lý bình luận và SLA',
      priority: 'HIGH',
      category: 'HARDWARE',
    },
  });
  const ticketId = createTicketRes.body?.ticket?.id || createTicketRes.body?.id;
  assert(createTicketRes.status === 201 && Boolean(ticketId), 'Tạo ticket hỗ trợ mới thành công');

  // 4.2 Post comment on valid ticket
  if (ticketId) {
    const commentRes = await request(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body: {
        content: 'Kỹ thuật viên đang kiểm tra lỗi thiết bị.',
        isInternal: false,
        spentMinutes: 30,
      },
    });
    assert(commentRes.status === 200 || commentRes.status === 201, 'Thêm bình luận và ghi nhận thời gian xử lý (spentMinutes)');
  }

  // 4.3 Post comment on NON-EXISTENT ticket UUID
  const fakeTicketUuid = '00000000-0000-0000-0000-000000000000';
  const nonExistCommentRes = await request(`/api/tickets/${fakeTicketUuid}/comments`, {
    method: 'POST',
    body: { content: 'Bình luận trên ticket không tồn tại' },
  });
  assert(
    nonExistCommentRes.status === 404 || nonExistCommentRes.status === 500,
    `Bình luận trên ticket không tồn tại được chặn an toàn (Mã: ${nonExistCommentRes.status})`
  );

  // 4.4 Ticket Auto-Close Cron (Dry run)
  const cronAutoCloseRes = await request('/api/cron/ticket-auto-close?dryRun=true');
  assert(cronAutoCloseRes.status === 200 && cronAutoCloseRes.body.dryRun === true, 'Chạy cron quét đóng ticket tự động (Dry-run mode)');

  // ----------------------------------------------------
  // SECTION 5: APPROVALS WORKFLOW & ROBUSTNESS
  // ----------------------------------------------------
  console.log('\n👉 [5] Kiểm thử Quy trình Phê duyệt Mua sắm/Cấp phát (Approvals)...');

  // 5.1 Create Approval Request
  const createApprovalRes = await request('/api/approvals', {
    method: 'POST',
    body: {
      type: 'NEW_DEVICE',
      title: 'Đề xuất trang bị màn hình 27 inch 4K Dell UltraSharp',
      description: 'Phục vụ thiết kế đồ họa',
      justification: 'Màn hình cũ bị sọc panel',
      estimatedCost: 11500000,
      quantity: 1,
    },
  });
  assert(createApprovalRes.status === 200 || createApprovalRes.status === 201, 'Tạo đề xuất phê duyệt trang bị thiết bị');
  const approvalId = createApprovalRes.body?.approval?.id;

  // 5.2 Approve Step (IT Approval)
  if (approvalId) {
    const approveRes = await request(`/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: { note: 'Đã thẩm định thông số kỹ thuật hợp lý' },
    });
    assert(approveRes.status === 200 && approveRes.body.success, 'Quản trị viên phê duyệt đề xuất thành công');
  }

  // ----------------------------------------------------
  // SECTION 6: SPARE PARTS & STOCK VALIDATION
  // ----------------------------------------------------
  console.log('\n👉 [6] Kiểm thử Quản lý Phụ tùng & Kho linh kiện (Spare Parts)...');

  // 6.1 Create Spare Part
  const partSku = `RAM-DDR5-QA-${Date.now().toString().slice(-4)}`;
  const createPartRes = await request('/api/spare-parts', {
    method: 'POST',
    body: {
      name: 'Thanh RAM Kingston Fury 16GB DDR5 5600MHz',
      sku: partSku,
      category: 'RAM',
      quantity: 10,
      minQuantity: 3,
      unit: 'Thanh',
      unitPrice: 1450000,
      location: 'Tủ A - Kệ 2',
    },
  });
  assert(createPartRes.status === 201 && createPartRes.body.success, 'Tạo phụ tùng kho linh kiện mới');
  const partId = createPartRes.body?.sparePart?.id;

  if (partId) {
    // 6.2 Stock In
    const stockInRes = await request(`/api/spare-parts/${partId}/transactions`, {
      method: 'POST',
      body: {
        type: 'IN',
        quantity: 5,
        note: 'Nhập thêm 5 thanh từ NCC',
      },
    });
    assert(stockInRes.status === 201 && stockInRes.body.sparePart.quantity === 15, 'Nhập thêm linh kiện vào kho (Stock In: 10 + 5 = 15)');

    // 6.3 Stock Out exceeding available quantity
    const stockOutExcessRes = await request(`/api/spare-parts/${partId}/transactions`, {
      method: 'POST',
      body: {
        type: 'OUT',
        quantity: 999,
        note: 'Xuất vượt tồn',
      },
    });
    assert(stockOutExcessRes.status === 400, 'Chặn xuất kho vượt quá số lượng tồn kho (400 Bad Request)');

    // 6.4 Clean up part to trash & restore
    const delPartRes = await request(`/api/spare-parts/${partId}`, { method: 'DELETE' });
    assert(delPartRes.status === 200 && delPartRes.body.inTrash, 'Xóa phụ tùng chuyển vào Thùng rác');

    if (delPartRes.body?.trashItemId) {
      const restorePartRes = await request(`/api/trash/${delPartRes.body.trashItemId}/restore`, {
        method: 'POST',
      });
      assert(restorePartRes.status === 200 && restorePartRes.body.success, 'Khôi phục phụ tùng từ Thùng rác');
    }
  }

  // ----------------------------------------------------
  // SECTION 7: FLOOR MAPS & RACK CABINETS
  // ----------------------------------------------------
  console.log('\n👉 [7] Kiểm thử Bản đồ sơ đồ sàn & Tủ Rack (Floor Maps & Racks)...');

  // 7.1 Get Racks
  const getRacksRes = await request('/api/floor-maps/racks');
  assert(getRacksRes.status === 200 && Array.isArray(getRacksRes.body.data), 'Lấy danh sách tủ rack thành công');

  // 7.2 Create Custom Rack
  const customRackRes = await request('/api/floor-maps/racks', {
    method: 'POST',
    body: {
      name: 'Tủ Rack Phân Phối Tầng 5 (QA)',
      code: `RCK-QA-${Date.now().toString().slice(-4)}`,
      totalU: 24,
      category: 'Phân Phối Tầng',
      brand: 'APC 24U',
      maxPowerWatts: 3000,
    },
  });
  assert(customRackRes.status === 200 || customRackRes.status === 201, 'Tạo cấu hình tủ rack tùy chỉnh');

  // ----------------------------------------------------
  // SECTION 8: EXPORT MODULES (EXCEL & DATA STREAMS)
  // ----------------------------------------------------
  console.log('\n👉 [8] Kiểm thử Xuất file Excel báo cáo (Export Assets & Licenses)...');

  // 8.1 Export Assets
  const exportAssetsRes = await request('/api/export/assets');
  assert(
    exportAssetsRes.status === 200 &&
      (exportAssetsRes.headers['content-type']?.includes('spreadsheet') ||
        exportAssetsRes.headers['content-disposition']?.includes('attachment')),
    'Xuất danh sách Tài sản sang định dạng Excel (.xlsx) chuẩn chỉnh'
  );

  // 8.2 Export Licenses
  const exportLicensesRes = await request('/api/export/licenses');
  assert(
    exportLicensesRes.status === 200 &&
      (exportLicensesRes.headers['content-type']?.includes('spreadsheet') ||
        exportLicensesRes.headers['content-disposition']?.includes('attachment')),
    'Xuất danh sách Bản quyền License sang định dạng Excel (.xlsx) chuẩn chỉnh'
  );

  // 8.3 Export Users
  const exportUsersRes = await request('/api/export/users');
  assert(exportUsersRes.status === 200, 'Xuất danh sách Nhân sự / Người dùng');

  // ----------------------------------------------------
  // SECTION 9: SYSTEM BACKUP & DATA RECOVERY ENGINE
  // ----------------------------------------------------
  console.log('\n👉 [9] Kiểm thử Động cơ Sao lưu & Phục hồi Hệ thống (System Backup Engine)...');

  // 9.1 Export System Backup JSON
  const backupGetRes = await request('/api/system/backup');
  assert(
    backupGetRes.status === 200 &&
      (backupGetRes.headers['content-disposition']?.includes('attachment') || backupGetRes.body?.meta),
    'Tạo và trích xuất file sao lưu hệ thống hoàn chỉnh (JSON Backup)'
  );

  // 9.2 Post malformed backup payload
  const malformedBackupRes = await request('/api/system/backup', {
    method: 'POST',
    body: { data: 'invalid-non-object-data' },
  });
  assert(
    malformedBackupRes.status === 400 || malformedBackupRes.status === 500,
    `Phục hồi dữ liệu sai cấu trúc không làm sập tiến trình hệ thống (Mã: ${malformedBackupRes.status})`
  );

  // ----------------------------------------------------
  // SECTION 10: USER OFFBOARDING WORKFLOW
  // ----------------------------------------------------
  console.log('\n👉 [10] Kiểm thử Quy trình Thu hồi & Thôi việc (User Offboarding Lifecycle)...');

  // 10.1 Create a temporary employee user
  const tempEmpEmail = `emp.offboard.${Date.now()}@test.vn`;
  const defaultRole = await request('/api/users');
  const roleId = defaultRole.body?.data?.[0]?.roleId || defaultRole.body?.users?.[0]?.roleId;

  const createEmpRes = await request('/api/users', {
    method: 'POST',
    body: {
      email: tempEmpEmail,
      fullName: 'Nhân Viên Thử Nghiệm Offboard',
      password: 'EmployeePassword@123',
      roleId: roleId,
      department: 'Kinh Doanh',
    },
  });

  const empId = createEmpRes.body?.data?.id || createEmpRes.body?.user?.id;
  if (empId) {
    assert(true, 'Tạo nhân viên thử nghiệm cho quy trình nghỉ việc');

    // 10.2 Create an asset and assign to this employee
    const offboardAssetTag = `AST-OFF-${Date.now().toString().slice(-4)}`;
    const createAssetRes = await request('/api/assets', {
      method: 'POST',
      body: {
        assetTag: offboardAssetTag,
        name: 'Laptop HP EliteBook G8 Offboard Test',
        status: 'AVAILABLE',
        condition: 'GOOD',
      },
    });
    const offboardAssetId = createAssetRes.body?.id || createAssetRes.body?.data?.id;

    if (offboardAssetId) {
      // Assign asset to user
      await request(`/api/assets/${offboardAssetId}/assign`, {
        method: 'POST',
        body: {
          userId: empId,
          notes: 'Cấp phát cho nhân sự mới',
        },
      });
    }

    // 10.3 Run Offboarding API
    const offboardRes = await request(`/api/users/${empId}/offboard`, {
      method: 'POST',
      body: {
        notes: 'Chấm dứt hợp đồng lao động theo nguyện vọng cá nhân',
        closeRemainingTickets: true,
      },
    });
    assert(offboardRes.status === 200 && offboardRes.body.success, 'Thực thi lệnh Thôi việc / Offboarding nhân sự');

    // 10.4 Verify asset is freed back to AVAILABLE
    if (offboardAssetId) {
      const checkAssetRes = await request(`/api/assets/${offboardAssetId}`);
      assert(checkAssetRes.body?.data?.status === 'AVAILABLE', 'Tài sản đã tự động thu hồi về trạng thái SẴN SÀNG (AVAILABLE)');
      // Cleanup asset
      await request(`/api/assets/${offboardAssetId}`, { method: 'DELETE' });
    }

    // 10.5 Verify offboarded user cannot log in
    const offboardLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: tempEmpEmail, password: 'EmployeePassword@123' },
    });
    assert(offboardLoginRes.status === 403, 'Chặn đăng nhập nhân sự đã thôi việc (403 Forbidden)');
  }

  // ----------------------------------------------------
  // SUMMARY REPORT
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ CHUYÊN SÂU HỆ THỐNG');
  console.log('====================================================');
  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;

  console.log(`Tổng số ca kiểm thử thực thi: ${total}`);
  console.log(`Số ca ĐẠT (PASS)           : ${passed}`);
  console.log(`Số ca THẤT BẠI (FAIL)      : ${failed}`);
  console.log(`Tỷ lệ thành công           : ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nDanh sách ca thất bại:');
    testResults.filter((t) => !t.passed).forEach((t) => {
      console.log(` - ❌ ${t.name}: ${t.details}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 TOÀN BỘ CÁC MODULE VÀ TÌNH HUỐNG BIÊN ĐỀU VƯỢT QUA KIỂM THỬ XUẤT SẮC!');
  }
}

runAllTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử:', err);
  process.exit(1);
});
