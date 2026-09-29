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
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email: 'admin@company.com', password: process.env.TEST_PASSWORD || 'Admin@123' },
  });

  const cookie = loginRes.headers['set-cookie']
    ? loginRes.headers['set-cookie'].map((c) => c.split(';')[0]).join('; ')
    : '';

  console.log('Testing ai-analyze for printer issue...');
  const res = await request('/api/tickets/ai-analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: { text: 'sửa lỗi máy in không in được' },
  });

  console.log('Status:', res.status);
  console.log('Category:', res.body?.data?.category);
  console.log('ServiceName:', res.body?.data?.serviceName);
  console.log('Priority:', res.body?.data?.priorityLevel, res.body?.data?.priority);
  console.log('MatchedAssetId:', res.body?.data?.matchedAssetId);
  console.log('MatchedAssetName:', res.body?.data?.matchedAssetName);

  if (res.body?.data?.matchedAssetId === null) {
    console.log('✅ PASS: Laptop was NOT incorrectly bound to the printer ticket!');
  } else {
    console.log('❌ FAIL: Asset was bound:', res.body?.data?.matchedAssetName);
  }
}

run();
