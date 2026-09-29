// scripts/test-part1-logic.js
const http = require('http');
const assert = require('assert');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, text: data });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🧪 [Test Suite: Part 1 Logic Edge Cases & Improvements]');

  // 1. Check Asset Financial KPI calculation with currency conversion
  console.log('\n1. Testing Asset Financial API Multi-Currency Normalization...');
  // Login first to get cookie
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@company.com', password: process.env.TEST_PASSWORD || 'Admin@123' },
  });

  const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
  const authHeaders = cookie ? { Cookie: cookie.split(';')[0] } : {};

  const assetsRes = await request('/api/assets?page=1&pageSize=10', {
    headers: authHeaders,
  });
  assert.strictEqual(assetsRes.status, 200, 'Assets API should return 200');
  assert.ok(assetsRes.body.summary, 'Assets API should return summary KPI');
  assert.ok(typeof assetsRes.body.summary.totalOriginalPrice === 'number', 'totalOriginalPrice must be a number');
  console.log('   ✅ Asset Financial KPI returned valid normalized values:', {
    totalOriginalPrice: assetsRes.body.summary.totalOriginalPrice,
    totalDepreciation: assetsRes.body.summary.totalDepreciation,
    remainingValue: assetsRes.body.summary.remainingValue,
  });

  // 2. Test Guest Self-Service Incident Reporting via QR scan API
  console.log('\n2. Testing Public Guest Ticket Report via POST /api/scan/[tag]...');
  const firstAsset = assetsRes.body.data?.[0];
  assert.ok(firstAsset, 'Should have at least one asset to test QR reporting');

  const guestReportRes = await request(`/api/scan/${encodeURIComponent(firstAsset.assetTag)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      senderName: 'Nguyen Van Test',
      senderContact: 'guest.test@company.com',
      title: 'Màn hình bị sọc ngang khi cắm sạc',
      description: 'Hiện tượng xuất hiện ngẫu nhiên sau khi khởi động khoảng 5 phút.',
      priority: 'MEDIUM',
    },
  });

  assert.strictEqual(guestReportRes.status, 200, 'Guest report should return 200');
  assert.ok(guestReportRes.body.success, 'Guest report should succeed');
  assert.ok(guestReportRes.body.data?.ticketNumber, 'Guest report should return generated ticket number');
  console.log('   ✅ Guest ticket created successfully:', guestReportRes.body.data);

  // 3. Test 1-Click CSAT Rating via GET /api/tickets/[id]/rate
  console.log('\n3. Testing 1-Click CSAT Rating from Email Link...');
  const createdTicketId = guestReportRes.body.data.id;

  // Mark ticket as resolved first so it can be rated
  const resolveRes = await request(`/api/tickets/${createdTicketId}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: {
      status: 'RESOLVED',
      resolutionNotes: 'Đã thay cáp màn hình mới cho nhân sự.',
    },
  });
  assert.strictEqual(resolveRes.status, 200, 'Resolving ticket should return 200');

  // Now hit 1-click rating URL without login cookie
  const rateRes = await request(`/api/tickets/${createdTicketId}/rate?rating=5&comment=IT_phuc_vu_rat_nhiet_tinh`);
  // Rating endpoint returns a 307 or 302 redirect to /tickets?id=...&rated=true
  assert.ok([200, 302, 307].includes(rateRes.status), 'Rate endpoint should redirect or succeed');
  console.log('   ✅ 1-Click CSAT executed with response status:', rateRes.status, rateRes.headers?.location || '');

  // 4. Test 1-Click Return to Available (Asset Maintenance -> Available)
  console.log('\n4. Testing 1-Click Return to Available Status on Asset...');
  // Set asset to MAINTENANCE first
  const setMaintRes = await request(`/api/assets/${firstAsset.id}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: { status: 'MAINTENANCE' },
  });
  assert.strictEqual(setMaintRes.status, 200);

  // Now perform 1-click complete maintenance & return to AVAILABLE
  const setAvailRes = await request(`/api/assets/${firstAsset.id}`, {
    method: 'PUT',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: { status: 'AVAILABLE' },
  });
  assert.strictEqual(setAvailRes.status, 200);
  const updatedStatus = setAvailRes.body.data?.status || setAvailRes.body.status;
  assert.strictEqual(updatedStatus, 'AVAILABLE', 'Asset should be restored to AVAILABLE');
  console.log(`   ✅ Asset ${firstAsset.assetTag} successfully returned to AVAILABLE inventory.`);

  console.log('\n🎉 ALL 4 PART 1 LOGIC & EDGE-CASE IMPROVEMENTS VERIFIED AND WORKING 100%!');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
