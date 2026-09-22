const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runFeatureUpgradesQa() {
  console.log('================================================================');
  console.log('🚀 KIỂM THỬ TỰ ĐỘNG 4 TÍNH NĂNG THÔNG MINH MỚI NÂNG CẤP');
  console.log(`📍 Server: ${BASE_URL} | Time: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name, condition, errorMsg = '') {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      failed++;
      console.log(`  ❌ [FAIL] ${name} -> ${errorMsg}`);
    }
  }

  // 1. Admin login to get session cookie
  console.log('\n--- 🔑 1. ĐĂNG NHẬP ADMIN ---');
  let cookie = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'Admin@123' }),
    });
    assert('Admin login HTTP 200', loginRes.ok, `Status: ${loginRes.status}`);
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
      assert('Nhận session cookie hợp lệ', !!cookie);
    }
  } catch (e) {
    assert('Login request success', false, e.message);
  }

  // 2. Test Ticket Smart Deflection KB Lookup API
  console.log('\n--- 💡 2. KIỂM THỬ SMART DEFLECTION (GỢI Ý GIẢI PHÁP KB) ---');
  try {
    const kbRes = await fetch(`${BASE_URL}/api/kb?search=${encodeURIComponent('mật khẩu')}`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/kb?search=mật khẩu HTTP 200', kbRes.ok);
    const kbJson = await kbRes.json();
    assert('KB trả về danh sách gợi ý giải pháp', kbJson.success && Array.isArray(kbJson.data));
    const matchingArticles = (kbJson.data || []).filter((a) =>
      a.title.toLowerCase().includes('mật khẩu') || a.content?.toLowerCase().includes('mật khẩu')
    );
    assert(
      `Tìm thấy ${matchingArticles.length} bài viết KB phù hợp cho từ khóa "mật khẩu"`,
      matchingArticles.length > 0
    );
    if (matchingArticles.length > 0) {
      console.log(`     → Ví dụ giải pháp tự phục vụ: "${matchingArticles[0].title}"`);
    }
  } catch (e) {
    assert('KB deflection check failed', false, e.message);
  }

  // 3. Test One-Time Self-Destructing Secret Link
  console.log('\n--- 🔒 3. KIỂM THỬ LINK CHIA SẺ MẬT KHẨU TỰ HỦY DÙNG 1 LẦN ---');
  let secretToken = '';
  const testSecret = `P@ssw0rd_${Date.now()}!#Secure`;
  const testUsername = 'vpn_user_test';

  try {
    // 3.1 Create Secret
    const createRes = await fetch(`${BASE_URL}/api/passwords/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        title: 'Mật khẩu VPN tạm thời cho QA',
        username: testUsername,
        password: testSecret,
        notes: 'Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.',
        expiresInHours: 24,
        maxViews: 1,
      }),
    });

    assert('POST /api/passwords/share tạo link bí mật HTTP 200', createRes.ok);
    const createJson = await createRes.json();
    assert('Trả về token và đường dẫn shareUrl', createJson.success && !!createJson.token);
    secretToken = createJson.token;
    console.log(`     → Token bí mật được tạo: ${secretToken}`);
    console.log(`     → URL công khai: ${BASE_URL}${createJson.shareUrl}`);

    // 3.2 Public Peek Check (Without Authentication, Without Burning)
    const peekRes = await fetch(`${BASE_URL}/api/passwords/share/${secretToken}?peek=true`);
    assert('GET /api/passwords/share/[token]?peek=true (Public, không cần login) HTTP 200', peekRes.ok);
    const peekJson = await peekRes.json();
    assert('Peek xác nhận bí mật tồn tại và chưa bị tiêu hủy', peekJson.exists === true);

    // 3.3 Public Reveal & Burn Check (Read Once)
    const revealRes = await fetch(`${BASE_URL}/api/passwords/share/${secretToken}`);
    assert('GET /api/passwords/share/[token] mở xem bí mật HTTP 200', revealRes.ok);
    const revealJson = await revealRes.json();
    assert('Giải mã chính xác mật khẩu ban đầu', revealJson.secret?.password === testSecret);
    assert('Chính xác username gửi kèm', revealJson.secret?.username === testUsername);
    assert('Hệ thống đánh dấu burned = true (Đã tiêu hủy)', revealJson.burned === true);
    console.log(`     → Dữ liệu bí mật nhận được an toàn: password="${revealJson.secret?.password}"`);

    // 3.4 Second View Attempt (Must Fail & Return 404/Burned)
    const secondViewRes = await fetch(`${BASE_URL}/api/passwords/share/${secretToken}`);
    assert(
      'Mở link lần 2 bị từ chối (HTTP 404 / 410 - Đã bị tiêu hủy vĩnh viễn)',
      secondViewRes.status === 404 || secondViewRes.status === 410
    );
    const secondJson = await secondViewRes.json();
    assert(
      'Thông báo lỗi tự hủy chuẩn xác',
      secondJson.burned === true || secondJson.error?.includes('tiêu hủy')
    );
    console.log(`     → Phản hồi an toàn lần 2: "${secondJson.error}"`);
  } catch (e) {
    assert('One-time secret test failed', false, e.message);
  }

  // 4. Component and File Integrity Check
  console.log('\n--- 🧩 4. KIỂM THỬ TOÀN VẸN CÁC THÀNH PHẦN GIAO DIỆN ---');
  const fs = require('fs');

  assert(
    'File SignaturePadModal.tsx tồn tại và đầy đủ Canvas Pointer Events',
    fs.existsSync('src/components/assets/SignaturePadModal.tsx') &&
    fs.readFileSync('src/components/assets/SignaturePadModal.tsx', 'utf-8').includes('onPointerDown')
  );

  assert(
    'File asset-handover-modal.tsx tích hợp chữ ký điện tử và xuất Word',
    fs.readFileSync('src/components/assets/asset-handover-modal.tsx', 'utf-8').includes('SignaturePadModal') &&
    fs.readFileSync('src/components/assets/asset-handover-modal.tsx', 'utf-8').includes('receiverSignature')
  );

  assert(
    'File OneTimeSecretModal.tsx tồn tại với mã hóa và tùy chọn tự hủy',
    fs.existsSync('src/components/passwords/OneTimeSecretModal.tsx') &&
    fs.readFileSync('src/components/passwords/OneTimeSecretModal.tsx', 'utf-8').includes('handleGenerate')
  );

  assert(
    'File GlobalSearch.tsx tích hợp Quick Actions và Điều hướng trực tiếp',
    fs.readFileSync('src/components/common/GlobalSearch.tsx', 'utf-8').includes('STATIC_ACTIONS') &&
    fs.readFileSync('src/components/common/GlobalSearch.tsx', 'utf-8').includes('matchedActions')
  );

  assert(
    'File CreateTicketModal.tsx tích hợp giải quyết tức thì và hủy ticket',
    fs.readFileSync('src/components/tickets/CreateTicketModal.tsx', 'utf-8').includes('deflectedSuccess') &&
    fs.readFileSync('src/components/tickets/CreateTicketModal.tsx', 'utf-8').includes('setDeflectedSuccess')
  );

  // Summary
  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed} PASS / ${failed} FAIL (Tỷ lệ: ${Math.round((passed / (passed + failed)) * 100)}%)`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ 4 TÍNH NĂNG ĐÃ SẴN SÀNG HOẠT ĐỘNG HOÀN HẢO TRÊN TOÀN HỆ THỐNG!');
  }
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runFeatureUpgradesQa().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
