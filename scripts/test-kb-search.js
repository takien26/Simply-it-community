const http = require('http');

const BASE_URL = 'http://localhost:3001';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const req = http.request(
      url,
      {
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, text: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function run() {
  console.log('Logging in as admin...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@company.com', password: process.env.TEST_PASSWORD || 'Admin@123' },
  });

  const cookie = loginRes.headers['set-cookie']
    ? loginRes.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ')
    : '';

  const query = encodeURIComponent('sửa lỗi máy in không in được');

  // Test 1: With category=HARDWARE (Current form behavior)
  console.log('\n=== TEST 1: Current Behavior (with category=HARDWARE) ===');
  const res1 = await request(`/api/kb?search=${query}&category=HARDWARE`, {
    headers: { Cookie: cookie },
  });
  console.log('Status:', res1.status, 'Total articles:', res1.body?.data?.length);
  if (res1.body?.data) {
    res1.body.data.slice(0, 5).forEach((a) => {
      console.log(`* [Score: ${a.searchScore}] [${a.categoryKey}] ${a.title}`);
      console.log(`  Reason: ${a.matchReason}`);
    });
  }

  // Test 2: Without category filter (Proposed behavior)
  console.log('\n=== TEST 2: Proposed Behavior (without category restriction) ===');
  const res2 = await request(`/api/kb?search=${query}`, {
    headers: { Cookie: cookie },
  });
  console.log('Status:', res2.status, 'Total articles:', res2.body?.data?.length);
  if (res2.body?.data) {
    res2.body.data.slice(0, 5).forEach((a) => {
      console.log(`* [Score: ${a.searchScore}] [${a.categoryKey}] ${a.title}`);
      console.log(`  Reason: ${a.matchReason}`);
    });
  }
}

run();
