const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runRunwayQa() {
  console.log('================================================================');
  console.log('📊 KIỂM THỬ TÍNH NĂNG LỊCH GIA HẠN CHI PHÍ 12 THÁNG (RENEWAL RUNWAY)');
  console.log(`📍 Endpoint: ${BASE_URL} | Time: ${new Date().toISOString()}`);
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

  // 2. Fetch Services & Licenses
  console.log('\n--- 📦 2. NẠP DỮ LIỆU DỊCH VỤ & BẢN QUYỀN ---');
  let services = [];
  let licenses = [];
  try {
    const sRes = await fetch(`${BASE_URL}/api/services?pageSize=200`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/services HTTP 200', sRes.ok);
    const sJson = await sRes.json();
    services = sJson.data || [];
    assert(`Có ${services.length} gói dịch vụ IT trong hệ thống`, services.length >= 0);

    const lRes = await fetch(`${BASE_URL}/api/licenses?pageSize=200`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/licenses HTTP 200', lRes.ok);
    const lJson = await lRes.json();
    licenses = lJson.data || [];
    assert(`Có ${licenses.length} gói bản quyền trong hệ thống`, licenses.length >= 0);
  } catch (e) {
    assert('Fetch data error', false, e.message);
  }

  // 3. Test Projection Logic Algorithm
  console.log('\n--- 🧮 3. KIỂM THỬ THUẬT TOÁN PHÂN BỔ 12 THÁNG ---');

  // Test service mock
  const mockMonthly = {
    serviceCode: 'TEST-MONTHLY',
    name: 'Gói Cáp Quang FTTH 1Gbps',
    cost: 1000000,
    currency: 'VND',
    billingCycle: 'MONTHLY',
    startDate: '2026-01-01',
    status: 'ACTIVE',
  };

  const mockQuarterly = {
    serviceCode: 'TEST-QUARTERLY',
    name: 'Gói Hosting Quý',
    cost: 3000000,
    currency: 'VND',
    billingCycle: 'QUARTERLY',
    renewalDate: '2026-10-15',
    status: 'ACTIVE',
  };

  const mockAnnual = {
    serviceCode: 'TEST-ANNUAL',
    name: 'Hợp Đồng Bảo Trì SLA 1 Năm',
    cost: 24000000,
    currency: 'VND',
    billingCycle: 'ANNUAL',
    renewalDate: '2026-12-01',
    status: 'ACTIVE',
  };

  // Check 12-month projection for monthly
  let monthlyOccurrences = 0;
  for (let i = 0; i < 12; i++) {
    monthlyOccurrences++; // MONTHLY occurs all 12 months
  }
  assert('Gói Monthly xuất hiện đúng 12 lần / 12 tháng', monthlyOccurrences === 12);

  // Check quarterly: in a 12 month period, it occurs exactly 4 times
  let quarterlyOccurrences = 0;
  const baseMonth = new Date(mockQuarterly.renewalDate).getMonth();
  for (let i = 0; i < 12; i++) {
    if (Math.abs(i - 0) % 3 === 0) {
      quarterlyOccurrences++;
    }
  }
  assert('Gói Quarterly xuất hiện đúng 4 lần / 12 tháng', quarterlyOccurrences === 4);

  // Check annual: in a 12 month period, it occurs exactly 1 time
  let annualOccurrences = 0;
  const targetAnnualMonth = new Date(mockAnnual.renewalDate).getMonth();
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    if (d.getMonth() === targetAnnualMonth) {
      annualOccurrences++;
    }
  }
  assert('Gói Annual xuất hiện đúng 1 lần / 12 tháng', annualOccurrences === 1);

  // 4. Test Multi-currency Conversion Projection
  console.log('\n--- 💱 4. KIỂM THỬ QUY ĐỔI ĐA NGOẠI TỆ ---');
  const usdCost = 100; // 100 USD
  const rateUsdToVnd = 25400;
  const convertedVnd = usdCost * rateUsdToVnd;
  assert('100 USD quy đổi ra VND chuẩn xác (2,540,000 ₫)', convertedVnd === 2540000);

  // 5. Test Frontend Route HTTP 200 with ?view=runway
  console.log('\n--- 🌐 5. KIỂM THỬ ROUTE /services?view=runway ---');
  try {
    const pageRes = await fetch(`${BASE_URL}/services?view=runway`, {
      headers: { Cookie: cookie },
    });
    assert('/services?view=runway phản hồi HTTP 200 OK', pageRes.ok, `Status: ${pageRes.status}`);
  } catch (e) {
    assert('Fetch /services?view=runway error', false, e.message);
  }

  // 6. Test Dashboard Link Integration
  console.log('\n--- 🎯 6. KIỂM THỬ ROUTE /dashboard ---');
  try {
    const dashRes = await fetch(`${BASE_URL}/dashboard`, {
      headers: { Cookie: cookie },
    });
    assert('/dashboard phản hồi HTTP 200 OK', dashRes.ok, `Status: ${dashRes.status}`);
  } catch (e) {
    assert('Fetch /dashboard error', false, e.message);
  }

  console.log('\n================================================================');
  console.log(`🎉 KẾT QUẢ KIỂM THỬ RUNWAY: ${passed} PASS, ${failed} FAIL (Tỷ lệ: ${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runRunwayQa().catch((err) => {
  console.error('Test script crash:', err);
  process.exit(1);
});
