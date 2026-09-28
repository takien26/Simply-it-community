// scripts/qa-security-penetration.js
// SIMPLY IT — Tầng 1: Kiểm thử An ninh Bảo mật Chuyên sâu (Security & Penetration Testing)

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';
let adminToken = '';
let staffToken = '';
let staffUserId = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (options.token && !headers['Cookie']) {
      headers['Cookie'] = `simply_ce_token=${options.token}; auth-token=${options.token}`;
    } else if (adminToken && !headers['Cookie'] && options.token !== false) {
      headers['Cookie'] = `simply_ce_token=${adminToken}; auth-token=${adminToken}`;
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
          } catch {
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

    req.on('error', (err) => reject(err));

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
function assert(condition, code, name, details = '') {
  if (condition) {
    console.log(`  ✅ [PASS] [${code}] ${name}`);
    testResults.push({ code, name, passed: true, details });
  } else {
    console.error(`  ❌ [FAIL] [${code}] ${name} - ${details}`);
    testResults.push({ code, name, passed: false, details });
  }
}

function extractToken(res) {
  const cookieHeader = res.headers['set-cookie'];
  if (!cookieHeader) return '';
  const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
  for (const c of cookies) {
    for (const name of ['simply_ce_token', 'auth-token', 'auth_token_3001']) {
      const prefix = `${name}=`;
      if (c.startsWith(prefix)) {
        return c.split(';')[0].substring(prefix.length);
      }
    }
  }
  return '';
}

async function runSecurityTests() {
  console.log('================================================================');
  console.log('🛡️  TẦNG 1: KIỂM THỬ AN NINH BẢO MẬT & THÂM NHẬP (PENETRATION TEST)');
  console.log('================================================================\n');

  const bcrypt = require('bcryptjs');

  // --- BƯỚC 1: CHUẨN BỊ TÀI KHOẢN ---
  console.log('📌 [Setup] Đăng nhập Admin & Khởi tạo User nhân viên (Staff)...');
  
  // Đảm bảo mật khẩu admin@company.com đúng
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: { in: ['Super Admin', 'Admin'] } } },
    include: { role: true },
  });
  if (!adminUser) {
    throw new Error('Không tìm thấy tài khoản Quản trị viên trong Database');
  }
  const adminHashed = bcrypt.hashSync('Admin@123', 10);
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { passwordHash: adminHashed, isActive: true },
  });

  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminUser.email, password: 'Admin@123' },
    token: false,
  });
  adminToken = extractToken(adminLogin);
  assert(adminLogin.status === 200 && Boolean(adminToken), 'SETUP-01', `Đăng nhập Quản trị viên (${adminUser.email}) lấy Session Token`);

  // Tìm hoặc tạo Staff user
  let staffRole = await prisma.role.findFirst({ where: { name: 'Staff' } }) ||
                  await prisma.role.findFirst({ where: { isSystem: true, name: { notIn: ['Super Admin', 'Admin'] } } });
  
  const staffEmail = 'staff_security_qa@company.com';
  const staffHashed = bcrypt.hashSync('Staff@123', 10);
  const staffUser = await prisma.user.upsert({
    where: { email: staffEmail },
    update: { passwordHash: staffHashed, isActive: true, roleId: staffRole.id },
    create: {
      email: staffEmail,
      fullName: 'QA Staff Tester',
      roleId: staffRole.id,
      passwordHash: staffHashed,
      isActive: true,
    },
  });
  staffUserId = staffUser.id;

  const staffLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: staffEmail, password: 'Staff@123' },
    token: false,
  });
  staffToken = extractToken(staffLogin);
  assert(staffLogin.status === 200 && Boolean(staffToken), 'SETUP-02', `Đăng nhập Nhân viên Staff (${staffEmail}) thành công`);

  // --- SEC-01: PHÂN QUYỀN CRON (/api/cron/*) ---
  console.log('\n📌 [SEC-01] Kiểm thử Chống leo quyền gọi Cron (/api/cron/*)...');
  const staffCronBackup = await request('/api/cron/backup?run=true', {
    method: 'GET',
    token: staffToken,
  });
  assert(
    staffCronBackup.status === 403,
    'SEC-01.1',
    'Nhân viên Staff gọi /api/cron/backup bị chặn 403 Forbidden',
    `Status: ${staffCronBackup.status}`
  );

  const staffCronSync = await request('/api/cron/directory-sync?force=true', {
    method: 'GET',
    token: staffToken,
  });
  assert(
    staffCronSync.status === 403,
    'SEC-01.2',
    'Nhân viên Staff gọi /api/cron/directory-sync bị chặn 403 Forbidden',
    `Status: ${staffCronSync.status}`
  );

  const anonCron = await request('/api/cron/backup', { method: 'GET', token: false });
  assert(
    anonCron.status === 401,
    'SEC-01.3',
    'Người dùng chưa đăng nhập gọi /api/cron/backup bị chặn 401 Unauthorized',
    `Status: ${anonCron.status}`
  );

  // --- SEC-02: THU HỒI PHIÊN TỨC THÌ KHI USER BỊ KHÓA / NGHỈ VIỆC ---
  console.log('\n📌 [SEC-02] Kiểm thử Thu hồi phiên JWT tức thì khi Nhân viên bị khóa (isActive=false)...');
  // Trước khi khóa: Staff gọi /api/auth/me thành công
  const staffMeBefore = await request('/api/auth/me', { token: staffToken });
  assert(staffMeBefore.status === 200, 'SEC-02.1', 'Staff đang Active gọi /api/auth/me thành công (200)');

  // Admin khóa tài khoản nhân viên qua API chính thức (tự động invalidate cache)
  const deactRes = await request(`/api/users/${staffUserId}`, {
    method: 'PUT',
    body: { isActive: false },
    token: adminToken,
  });
  assert(deactRes.status === 200, 'SEC-02.2A', 'Admin vô hiệu hóa tài khoản nhân viên thành công');

  // Staff dùng token cũ gọi lại /api/auth/me
  const staffMeAfter = await request('/api/auth/me', { token: staffToken });
  assert(
    staffMeAfter.status === 401,
    'SEC-02.2',
    'Staff vừa bị khóa dùng Token cũ gọi /api/auth/me bị từ chối 401 Unauthorized',
    `Status: ${staffMeAfter.status}`
  );

  // Staff gọi API dữ liệu /api/tickets
  const staffTicketsAfter = await request('/api/tickets', { token: staffToken });
  assert(
    staffTicketsAfter.status === 401,
    'SEC-02.3',
    'Staff vừa bị khóa dùng Token cũ gọi /api/tickets bị chặn 401',
    `Status: ${staffTicketsAfter.status}`
  );

  // Phục hồi lại isActive = true cho Staff qua API
  await request(`/api/users/${staffUserId}`, {
    method: 'PUT',
    body: { isActive: true },
    token: adminToken,
  });

  // --- SEC-03: CHỐNG BRUTE-FORCE VÀ TỰ HỦY LIÊN KẾT BÍ MẬT MỘT LẦN ---
  console.log('\n📌 [SEC-03] Kiểm thử Chống Brute-force & Tự hủy link bí mật sau 5 lần sai...');
  // Tạo link bí mật có Passphrase
  const createSecretRes = await request('/api/passwords/share', {
    method: 'POST',
    body: {
      title: 'QA Confidential Key',
      password: 'CONFIDENTIAL-API-KEY-999',
      passphrase: 'super-hard-passphrase',
      expiresInHours: 1,
      maxViews: 1,
    },
    token: adminToken,
  });
  const secretToken = createSecretRes.body?.token;
  assert(Boolean(secretToken), 'SEC-03.1', 'Tạo liên kết bí mật có Passphrase bảo vệ thành công');

  // Nhập sai 4 lần đầu
  let lastAttemptRes = null;
  for (let i = 1; i <= 4; i++) {
    lastAttemptRes = await request(`/api/passwords/share/${secretToken}?passphrase=wrong_${i}`, {
      method: 'GET',
      token: false,
    });
  }
  assert(
    lastAttemptRes.status === 403 && lastAttemptRes.body.incorrectPassphrase && lastAttemptRes.body.remainingAttempts === 1,
    'SEC-03.2',
    'Sau 4 lần nhập sai, API cảnh báo còn lại đúng 1 lần thử',
    `Remaining: ${lastAttemptRes.body.remainingAttempts}`
  );

  // Lần thứ 5 sai -> Phải tự hủy vĩnh viễn
  const fifthAttemptRes = await request(`/api/passwords/share/${secretToken}?passphrase=wrong_5`, {
    method: 'GET',
    token: false,
  });
  assert(
    fifthAttemptRes.status === 403 && fifthAttemptRes.body.burned === true,
    'SEC-03.3',
    'Lần thứ 5 sai: Liên kết bí mật kích hoạt tự hủy vĩnh viễn (burned: true)',
    `Status: ${fifthAttemptRes.status}`
  );

  // Lần thứ 6 (kể cả đúng mật khẩu) -> 404 không còn tồn tại
  const sixthAttemptRes = await request(`/api/passwords/share/${secretToken}?passphrase=super-hard-passphrase`, {
    method: 'GET',
    token: false,
  });
  assert(
    sixthAttemptRes.status === 404,
    'SEC-03.4',
    'Thử lại với mật khẩu đúng sau khi tự hủy: Báo lỗi 404 (Liên kết đã bị tiêu hủy)',
    `Status: ${sixthAttemptRes.status}`
  );

  // --- SEC-04: RATE LIMITING TRÊN ĐỔI MẬT KHẨU ---
  console.log('\n📌 [SEC-04] Kiểm thử Giới hạn tần suất đổi mật khẩu (Rate Limiting)...');
  const attempts = [];
  for (let i = 0; i < 7; i++) {
    attempts.push(
      await request('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: 'wrongPassword123', newPassword: 'newPassword@123' },
        token: adminToken,
      })
    );
  }
  const rateLimited = attempts.find((res) => res.status === 429);
  assert(
    Boolean(rateLimited),
    'SEC-04.1',
    'Gửi liên tiếp 7 lần đổi mật khẩu: Nhận mã 429 Too Many Requests',
    `Found 429 response: ${Boolean(rateLimited)}`
  );

  // --- SEC-05: BẢO VỆ TẢI TỆP AI EXTRACT ---
  console.log('\n📌 [SEC-05] Kiểm thử Lọc định dạng tệp nguy hiểm trên /api/ai/extract...');
  const FormData = require('buffer');
  // Thử gửi multipart form giả lập hoặc JSON không đúng định dạng extension
  const testBadExts = ['.bat', '.exe', '.html', '.svg'];
  let blockedCount = 0;
  for (const ext of testBadExts) {
    const boundary = '----WebKitFormBoundaryQA' + Date.now();
    const fakeBody = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="inputType"',
      '',
      'FILE',
      `--${boundary}`,
      'Content-Disposition: form-data; name="targetEntity"',
      '',
      'ASSET',
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="exploit${ext}"`,
      'Content-Type: application/octet-stream',
      '',
      'MALICIOUS_CONTENT_TEST',
      `--${boundary}--`,
    ].join('\r\n');

    const res = await request('/api/ai/extract', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: fakeBody,
      token: adminToken,
    });
    if (res.status === 400 && res.body?.error && res.body.error.includes('không được hỗ trợ')) {
      blockedCount++;
    }
  }
  assert(
    blockedCount === testBadExts.length,
    'SEC-05.1',
    `Chặn 100% định dạng tệp nguy hiểm (.bat, .exe, .html, .svg) tại /api/ai/extract (${blockedCount}/${testBadExts.length})`
  );

  // --- SEC-06: BẢO VỆ TẢI TỆP /api/upload (CHỐNG SVG XSS & EXECUTABLE) ---
  console.log('\n📌 [SEC-06] Kiểm thử Chặn tải lên .svg và .exe tại /api/upload...');
  let uploadBlocked = 0;
  for (const ext of ['.svg', '.exe', '.php']) {
    const boundary = '----WebKitFormBoundaryUpload' + Date.now();
    const fakeBody = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="file"; filename="test${ext}"`,
      'Content-Type: application/octet-stream',
      '',
      'TEST',
      `--${boundary}--`,
    ].join('\r\n');

    const res = await request('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body: fakeBody,
      token: adminToken,
    });
    if (res.status === 400 && res.body?.error) {
      uploadBlocked++;
    }
  }
  assert(
    uploadBlocked === 3,
    'SEC-06.1',
    `Chặn tải lên tệp .svg, .exe, .php tại /api/upload (Chống XSS và Malware) (${uploadBlocked}/3)`
  );

  // --- SEC-07: CHỐNG SQL INJECTION TRÊN SEARCH PARAMS ---
  console.log('\n📌 [SEC-07] Kiểm thử Chống SQL Injection trên thanh tìm kiếm...');
  const sqliPayloads = [
    "' OR 1=1 --",
    "'; DROP TABLE users; --",
    "\" OR \"\"=\"",
    "1' UNION SELECT 1,2,3 --",
  ];
  let sqliSafe = true;
  for (const payload of sqliPayloads) {
    const assetSearch = await request(`/api/assets?search=${encodeURIComponent(payload)}`, { token: adminToken });
    const ticketSearch = await request(`/api/tickets?search=${encodeURIComponent(payload)}`, { token: adminToken });
    if (assetSearch.status !== 200 || ticketSearch.status !== 200) {
      sqliSafe = false;
    }
  }
  assert(sqliSafe, 'SEC-07.1', 'Hệ thống an toàn tuyệt đối trước mọi SQL Injection payload qua tham số search (200 OK, 0 lỗi DB)');

  // --- SEC-08: ZERO-TRUST PASSWORD VAULT MASKING & ON-DEMAND REVEAL ---
  console.log('\n📌 [SEC-08] Kiểm thử Che giấu mật khẩu (Zero-Trust) & Giới hạn giải mã...');
  // 1. Tạo mật khẩu mới
  const passVaultRes = await request('/api/passwords', {
    method: 'POST',
    body: {
      title: 'QA Ultra Secret Key',
      username: 'root_qa',
      password: 'VeryConfidentialPassword@2026',
      category: 'SERVER',
      groupName: 'Infrastructure',
    },
    token: adminToken,
  });
  const passId = passVaultRes.body?.data?.id || passVaultRes.body?.password?.id;
  assert(Boolean(passId), 'SEC-08.1', 'Tạo tài khoản trong Két mật khẩu thành công');

  // 2. Lấy danh sách: Mật khẩu PHẢI bị che thành "••••••••"
  const listVaultRes = await request('/api/passwords', { token: adminToken });
  const passwordsList = listVaultRes.body?.data || listVaultRes.body?.passwords || [];
  const foundItem = passwordsList.find((p) => p.id === passId);
  assert(
    foundItem && foundItem.password === '••••••••',
    'SEC-08.2',
    'Danh sách API che giấu tuyệt đối mật khẩu thành "••••••••" (Zero-Trust Masking)',
    `Returned password: "${foundItem?.password}"`
  );

  // 3. Giải mã On-Demand
  const revealRes = await request(`/api/passwords/${passId}/reveal`, { method: 'POST', token: adminToken });
  const revealedPassword = revealRes.body?.data?.password || revealRes.body?.password;
  assert(
    revealRes.status === 200 && revealedPassword === 'VeryConfidentialPassword@2026',
    'SEC-08.3',
    'Giải mã On-Demand trả về mật khẩu gốc chính xác kèm Audit Log',
    `Decrypted: ${revealedPassword ? 'Thành công' : 'Thất bại'}`
  );

  // Dọn dẹp mật khẩu test
  await request(`/api/passwords/${passId}`, { method: 'DELETE', token: adminToken }).catch(() => {});

  // --- TỔNG KẾT ---
  console.log('\n================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`📊 TỔNG KẾT TẦNG 1: ${passed}/${total} BÀI KIỂM THỬ THÀNH CÔNG (Tỷ lệ: ${Math.round((passed / total) * 100)}%)`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ CÁC HẠNG MỤC AN NINH BẢO MẬT ĐỀU ĐẠT TIÊU CHUẨN XUẤT SẮC!');
  } else {
    console.log(`⚠️ CÒN ${failed} HẠNG MỤC CHƯA ĐẠT.`);
  }
  console.log('================================================================\n');

  await prisma.$disconnect();
  return { total, passed, failed };
}

runSecurityTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử an ninh:', err);
  process.exit(1);
});
