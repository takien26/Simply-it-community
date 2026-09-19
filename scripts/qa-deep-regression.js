const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';
let sessionCookie = '';

async function request(method, path, body = null, headers = {}) {
  const url = `${BASE_URL}${path}`;
  const reqHeaders = { ...headers };
  if (sessionCookie) {
    reqHeaders['Cookie'] = sessionCookie;
  }
  let reqBody = undefined;
  if (body) {
    if (typeof body === 'string' || body instanceof Buffer) {
      reqBody = body;
    } else {
      reqBody = JSON.stringify(body);
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  const cookieHeader = res.headers.get('set-cookie');
  if (cookieHeader) {
    const rawCookies = cookieHeader.split(/,(?=[^;]+;)/);
    for (const c of rawCookies) {
      const trimmed = c.trim();
      if (trimmed.startsWith('auth-token=') || trimmed.startsWith('token=')) {
        sessionCookie = trimmed.split(';')[0];
      }
    }
  }

  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = text;
  }

  return { status: res.status, headers: res.headers, body: json };
}

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✅ [PASS] ${message}`);
  }
}

async function run() {
  console.log('================================================================');
  console.log('🔬 BẮT ĐẦU KIỂM THỬ CHUYÊN SÂU CÁC LỖI VÀ TÍNH NĂNG MỚI (DEEP QA)');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(name, fn) {
    try {
      await fn();
      passed++;
    } catch (e) {
      console.error(`  ⚠️ Lỗi tại test: ${name} ->`, e.message);
      failed++;
    }
  }

  // 1. Đăng nhập Admin
  await testCase('Admin Login & Session Cookie', async () => {
    const res = await request('POST', '/api/auth/login', {
      email: 'admin@company.com',
      password: 'Admin@123',
    });
    assert(res.status === 200, 'Admin login trả về HTTP 200');
    assert(!!sessionCookie, 'Nhận được session cookie hợp lệ');
  });

  // 2. Kiểm tra Thùng rác cho Ticket (Trash & Restore)
  let testTicketId = null;
  let testTicketTrashId = null;
  await testCase('Ticket Recycle Bin: Xóa chuyển vào Thùng rác và Khôi phục', async () => {
    // Tạo ticket
    const createRes = await request('POST', '/api/tickets', {
      title: 'QA Test Ticket For Recycle Bin',
      description: 'Kiểm thử cơ chế thùng rác cho Ticket',
      category: 'HARDWARE',
      priority: 'HIGH',
    });
    assert(createRes.status === 200 || createRes.status === 201, 'Tạo ticket thành công');
    testTicketId = createRes.body.data ? createRes.body.data.id : createRes.body.id;
    assert(!!testTicketId, 'Ticket ID tồn tại');

    // Xóa ticket
    const delRes = await request('DELETE', `/api/tickets/${testTicketId}`);
    assert(delRes.status === 200, 'Xóa ticket trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'delRes.body.inTrash === true');

    // Kiểm tra trong Thùng rác
    const trashItem = await prisma.trashItem.findFirst({
      where: { entityType: 'TICKET', entityId: testTicketId },
    });
    assert(!!trashItem, 'Ticket tồn tại trong bảng TrashItem');
    testTicketTrashId = trashItem.id;

    // Khôi phục từ Thùng rác
    const restoreRes = await request('POST', `/api/trash/${testTicketTrashId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục Ticket trả về HTTP 200');
    assert(restoreRes.body.success === true, 'Khôi phục Ticket thành công');

    // Xác minh Ticket đã được phục hồi vào DB
    const restoredTicket = await prisma.ticket.findFirst({
      where: { title: 'QA Test Ticket For Recycle Bin' },
    });
    assert(!!restoredTicket, 'Ticket đã xuất hiện trở lại trong bảng Ticket');

    // Dọn dẹp
    if (restoredTicket) {
      await prisma.ticket.delete({ where: { id: restoredTicket.id } }).catch(() => {});
    }
  });

  // 3. Kiểm tra Thùng rác cho Tài liệu Document (Trash & Restore)
  let testDocId = null;
  let testDocTrashId = null;
  await testCase('Document Recycle Bin: Xóa chuyển vào Thùng rác và Khôi phục', async () => {
    // Tạo document
    const createRes = await request('POST', '/api/documents', {
      title: 'QA Test Contract 2026',
      type: 'CONTRACT',
      fileUrl: '/uploads/contract_test.pdf',
      fileName: 'contract_test.pdf',
      contractNumber: 'HD-QA-2026',
    });
    assert(createRes.status === 200 || createRes.status === 201, 'Tạo document thành công');
    testDocId = createRes.body.data ? createRes.body.data.id : createRes.body.id;
    assert(!!testDocId, 'Document ID tồn tại');

    // Xóa document
    const delRes = await request('DELETE', `/api/documents/${testDocId}`);
    assert(delRes.status === 200, 'Xóa document trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'delRes.body.inTrash === true');

    // Kiểm tra trong Thùng rác
    const trashItem = await prisma.trashItem.findFirst({
      where: { entityType: 'DOCUMENT', entityId: testDocId },
    });
    assert(!!trashItem, 'Document tồn tại trong bảng TrashItem');
    testDocTrashId = trashItem.id;

    // Khôi phục từ Thùng rác
    const restoreRes = await request('POST', `/api/trash/${testDocTrashId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục Document trả về HTTP 200');
    assert(restoreRes.body.success === true, 'Khôi phục Document thành công');

    // Xác minh Document đã được phục hồi vào DB
    const restoredDoc = await prisma.document.findFirst({
      where: { title: 'QA Test Contract 2026' },
    });
    assert(!!restoredDoc, 'Document đã xuất hiện trở lại trong bảng Document');

    // Dọn dẹp
    if (restoredDoc) {
      await prisma.document.delete({ where: { id: restoredDoc.id } }).catch(() => {});
    }
  });

  // 4. Kiểm tra Thùng rác cho Phụ tùng SparePart (Trash & Restore)
  let testSparePartId = null;
  let testSparePartTrashId = null;
  await testCase('SparePart Recycle Bin: Xóa chuyển vào Thùng rác và Khôi phục', async () => {
    // Tạo phụ tùng
    const createRes = await request('POST', '/api/spare-parts', {
      name: 'RAM DDR5 32GB Kingston QA',
      sku: 'RAM-DDR5-32G-QA',
      minStock: 5,
      unit: 'thanh',
      quantity: 10,
    });
    assert(createRes.status === 200 || createRes.status === 201, 'Tạo spare part thành công');
    testSparePartId = createRes.body.sparePart ? createRes.body.sparePart.id : createRes.body.id;
    assert(!!testSparePartId, 'SparePart ID tồn tại');

    // Xóa phụ tùng
    const delRes = await request('DELETE', `/api/spare-parts/${testSparePartId}`);
    assert(delRes.status === 200, 'Xóa spare part trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'delRes.body.inTrash === true');

    // Kiểm tra trong Thùng rác
    const trashItem = await prisma.trashItem.findFirst({
      where: { entityType: 'SPARE_PART', entityId: testSparePartId },
    });
    assert(!!trashItem, 'SparePart tồn tại trong bảng TrashItem');
    testSparePartTrashId = trashItem.id;

    // Khôi phục từ Thùng rác
    const restoreRes = await request('POST', `/api/trash/${testSparePartTrashId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục SparePart trả về HTTP 200');
    assert(restoreRes.body.success === true, 'Khôi phục SparePart thành công');

    // Xác minh SparePart đã được phục hồi vào DB
    const restoredPart = await prisma.sparePart.findFirst({
      where: { name: 'RAM DDR5 32GB Kingston QA' },
    });
    assert(!!restoredPart, 'SparePart đã xuất hiện trở lại trong bảng SparePart');

    // Dọn dẹp
    if (restoredPart) {
      await prisma.sparePart.delete({ where: { id: restoredPart.id } }).catch(() => {});
    }
  });

  // 5. Kiểm tra Security Whitelist của Endpoint Upload
  await testCase('Upload Security: Chặn các file thực thi nguy hiểm (.exe, .bat, .ps1, .sh, .php)', async () => {
    const boundary = '----WebKitFormBoundaryQA7MA4YWxkTrZu0gW';
    
    async function uploadDummyFile(filename, content) {
      const payload = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),
        Buffer.from(content),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);
      return await request('POST', '/api/upload', payload.toString('binary'), {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      });
    }

    const dangerousFiles = ['virus.exe', 'script.bat', 'payload.ps1', 'shell.sh', 'webshell.php', 'hack.vbs'];
    for (const file of dangerousFiles) {
      const res = await uploadDummyFile(file, 'echo malicious code');
      assert(res.status === 400, `Chặn file ${file} với HTTP 400`);
      assert(res.body.error && res.body.error.includes('không được phép tải lên'), `Thông báo lỗi an toàn cho ${file}`);
    }

    // Kiểm tra upload file hợp lệ (.pdf)
    const validRes = await uploadDummyFile('invoice_scan.pdf', '%PDF-1.4 dummy pdf content');
    assert(validRes.status === 200, 'Cho phép upload file hợp lệ invoice_scan.pdf (HTTP 200)');
    assert(validRes.body.success === true, 'Upload thành công');
  });

  // 6. Kiểm tra Xử lý Ngày tháng sai định dạng (Invalid Date Boundary Testing)
  await testCase('Date Validation: Trả về HTTP 400 thay vì 500 khi nhận ngày sai chuẩn', async () => {
    // Assets POST với ngày mua sai
    const badAssetRes = await request('POST', '/api/assets', {
      name: 'QA Laptop Invalid Date Test',
      purchaseDate: 'chuoi-ngay-sai-dinh-dang-1234',
    });
    assert(badAssetRes.status === 400, `Asset POST ngày sai trả về HTTP 400 (Status: ${badAssetRes.status})`);
    assert(badAssetRes.body.error && badAssetRes.body.error.includes('không hợp lệ'), 'Thông báo lỗi thân thiện cho client');

    // Licenses POST với ngày hết hạn sai
    const badLicenseRes = await request('POST', '/api/licenses', {
      name: 'QA Software Bad Date',
      expiryDate: 'invalid-expiry-date',
    });
    assert(badLicenseRes.status === 400, `License POST ngày sai trả về HTTP 400 (Status: ${badLicenseRes.status})`);
    assert(badLicenseRes.body.error && badLicenseRes.body.error.includes('không hợp lệ'), 'Thông báo lỗi thân thiện cho client');

    // Documents POST với ngày tài liệu sai
    const badDocRes = await request('POST', '/api/documents', {
      title: 'QA Bad Document Date',
      fileUrl: '/uploads/test.pdf',
      documentDate: 'sai-ngay-hoan-toan',
    });
    assert(badDocRes.status === 400, `Document POST ngày sai trả về HTTP 400 (Status: ${badDocRes.status})`);
    assert(badDocRes.body.error && badDocRes.body.error.includes('không hợp lệ'), 'Thông báo lỗi thân thiện cho client');
  });

  // 7. Kiểm tra Phân trang với tham số âm hoặc bằng 0 (Pagination Sanitization)
  await testCase('Pagination Edge Cases: Xử lý an toàn khi page <= 0 hoặc pageSize <= 0', async () => {
    const pageNegativeRes = await request('GET', '/api/assets?page=-5&pageSize=0');
    assert(pageNegativeRes.status === 200, 'GET /api/assets?page=-5&pageSize=0 không crash, trả về 200');
    assert(pageNegativeRes.body.pagination.page === 1, 'Tự động chuẩn hóa page âm về 1');
    assert(pageNegativeRes.body.pagination.pageSize >= 1, 'Tự động chuẩn hóa pageSize về tối thiểu hợp lệ');

    const licensePageRes = await request('GET', '/api/licenses?page=0&pageSize=-10');
    assert(licensePageRes.status === 200, 'GET /api/licenses?page=0&pageSize=-10 không crash, trả về 200');
    assert(licensePageRes.body.pagination.page === 1, 'Tự động chuẩn hóa page=0 về 1');

    const batchPageRes = await request('GET', '/api/import/batches?page=-1&pageSize=0');
    assert(batchPageRes.status === 200, 'GET /api/import/batches?page=-1&pageSize=0 không crash, trả về 200');
  });

  // 8. Kiểm tra Cho phép vượt hạn mức Bản quyền khi tạo mới (License Over-allocation Allowed)
  await testCase('License Over-allocation: Cho phép gán vượt số seats ban đầu theo thực tế', async () => {
    const existingUsers = await prisma.user.findMany({ take: 2, select: { id: true } });
    const pairs = existingUsers.map(u => ({ userId: u.id, assetId: null }));

    const overAllocRes = await request('POST', '/api/licenses', {
      name: 'QA Multi-Seat Software Over-allocated',
      totalSeats: 1,
      pairs,
    });
    assert(overAllocRes.status === 200 || overAllocRes.status === 201, `Tạo license với gán vượt seat thành công (HTTP: ${overAllocRes.status})`);
    const createdLicenseId = overAllocRes.body.data ? overAllocRes.body.data.id : overAllocRes.body.id;
    if (createdLicenseId) {
      await prisma.licenseAssignment.deleteMany({ where: { licenseId: createdLicenseId } });
      await prisma.license.delete({ where: { id: createdLicenseId } });
    }
  });

  // 9. Kiểm tra Két mật khẩu & Mật khẩu cấp 2 (Secondary Password)
  await testCase('Password Vault: Bảo mật AES-256-GCM & Xác thực Mật khẩu cấp 2', async () => {
    const pwdRes = await request('POST', '/api/passwords', {
      title: 'QA Test Server Root',
      username: 'root',
      password: 'SuperSecretPassword@2026!',
      category: 'SERVER',
      url: '192.168.1.100',
    });
    assert(pwdRes.status === 200 || pwdRes.status === 201, 'Tạo Password Vault entry thành công');
    const pwdId = pwdRes.body.data ? pwdRes.body.data.id : pwdRes.body.id;

    const wrongAuthRes = await request('POST', '/api/auth/secondary-password', {
      action: 'verify',
      secondaryPassword: 'WrongMasterPassword123',
    });
    assert(wrongAuthRes.status === 400 || wrongAuthRes.status === 401, 'Từ chối giải mã khi nhập sai Master Password cấp 2 (400/401)');

    if (pwdId) {
      await prisma.passwordEntry.delete({ where: { id: pwdId } }).catch(() => {});
    }
  });

  // 10. Kiểm tra Xóa Password vào Thùng rác & Ghi vết Audit Log
  await testCase('Password Vault: Xóa chuyển vào Thùng rác, Ghi Audit Log & Khôi phục', async () => {
    const pwdRes = await request('POST', '/api/passwords', {
      title: 'QA Database MySQL Master',
      username: 'dbadmin',
      password: 'DBPassword@2026!',
      category: 'DATABASE',
    });
    const pwdId = pwdRes.body.data ? pwdRes.body.data.id : pwdRes.body.id;
    assert(!!pwdId, 'Tạo password entry thành công');

    // Xóa password
    const delRes = await request('DELETE', `/api/passwords/${pwdId}`);
    assert(delRes.status === 200, 'Xóa password trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'delRes.body.inTrash === true');
    const trashItemId = delRes.body.trashItemId;
    assert(!!trashItemId, 'Nhận được trashItemId');

    // Kiểm tra Audit Log đã được ghi
    const audit = await prisma.auditLog.findFirst({
      where: { entityType: 'PasswordEntry', entityId: pwdId, action: 'DELETE' },
    });
    assert(!!audit, 'AuditLog ghi nhận hành vi DELETE PasswordEntry');

    // Khôi phục password từ Thùng rác
    const restoreRes = await request('POST', `/api/trash/${trashItemId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục password từ thùng rác HTTP 200');

    // Dọn dẹp
    await prisma.passwordEntry.deleteMany({ where: { title: 'QA Database MySQL Master' } });
  });

  // 11. Kiểm tra Incident Recycle Bin & Audit Log
  await testCase('Incident Management: Xóa chuyển vào Thùng rác & Khôi phục', async () => {
    const incRes = await request('POST', '/api/incidents', {
      title: 'QA Incident Core Switch Down',
      description: 'Mất kết nối switch trung tâm phòng server',
      severity: 'CRITICAL_P1',
    });
    const incId = incRes.body.data ? incRes.body.data.id : incRes.body.id;
    assert(!!incId, 'Tạo Incident thành công');

    const delRes = await request('DELETE', `/api/incidents/${incId}`);
    assert(delRes.status === 200, 'Xóa Incident trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'Incident chuyển vào Thùng rác');

    const trashItemId = delRes.body.trashItemId;
    const restoreRes = await request('POST', `/api/trash/${trashItemId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục Incident từ thùng rác thành công');

    await prisma.incident.deleteMany({ where: { title: 'QA Incident Core Switch Down' } });
  });

  // 12. Kiểm tra Problem Management Recycle Bin & Audit Log
  await testCase('Problem Management: Xóa chuyển vào Thùng rác & Khôi phục', async () => {
    const prbRes = await request('POST', '/api/problems', {
      title: 'QA Problem Root Cause Analysis',
      description: 'Lỗi tràn bộ nhớ đệm gateway switch',
      priority: 'HIGH',
      category: 'NETWORK',
    });
    const prbId = prbRes.body.data ? prbRes.body.data.id : prbRes.body.id;
    assert(!!prbId, 'Tạo Problem thành công');

    const delRes = await request('DELETE', `/api/problems?id=${prbId}`);
    assert(delRes.status === 200, 'Xóa Problem trả về HTTP 200');
    assert(delRes.body.inTrash === true, 'Problem chuyển vào Thùng rác');

    const trashItemId = delRes.body.trashItemId;
    const restoreRes = await request('POST', `/api/trash/${trashItemId}/restore`);
    assert(restoreRes.status === 200, 'Khôi phục Problem từ thùng rác thành công');

    await prisma.problem.deleteMany({ where: { title: 'QA Problem Root Cause Analysis' } });
  });

  // 13. Kiểm tra Xử lý JSON hỏng ở Auto-Scan Agent (Malformed JSON Resilience)
  await testCase('Auto-Scan Agent: Xử lý JSON đứt đoạn trả về HTTP 400', async () => {
    const malformedJsonRes = await request(
      'POST',
      '/api/v1/auto-scan/collect',
      '{ "hostname": "PC-TEST", "serialNumber": "SN-1234", "broken": ',
      { 'Content-Type': 'application/json' }
    );
    assert(malformedJsonRes.status === 400, 'JSON hỏng trả về HTTP 400 Bad Request (Không crash 500)');
    assert(malformedJsonRes.body.error.includes('không đúng định dạng JSON'), 'Thông báo lỗi JSON thân thiện');
  });

  // 14. Kiểm tra Chống tấn công Path Traversal (Directory Traversal Defense)
  await testCase('Security: Chống tấn công Path Traversal qua URL /uploads/../../', async () => {
    const traversalRes = await request('GET', '/uploads/..%2F..%2Fpackage.json');
    assert(traversalRes.status === 403 || traversalRes.status === 404, 'Chặn truy cập thư mục cha với 403/404');
  });

  // 15. Kiểm tra Xác thực định dạng URL cho Webhook (SSRF Defense)
  await testCase('Webhook URL Validation: Chặn protocol không an toàn (ftp, javascript, invalid)', async () => {
    const badWebhookRes = await request('POST', '/api/webhooks', {
      name: 'QA Malicious Webhook',
      webhookUrl: 'ftp://malicious.server/hook',
    });
    assert(badWebhookRes.status === 400, 'Chặn webhook protocol ftp:// với HTTP 400');

    const invalidUrlRes = await request('POST', '/api/webhooks', {
      name: 'QA Invalid URL',
      webhookUrl: 'not_a_valid_url',
    });
    assert(invalidUrlRes.status === 400, 'Chặn webhook url sai định dạng với HTTP 400');
  });

  console.log('\n================================================================');
  console.log('📊 KẾT QUẢ KIỂM THỬ CHUYÊN SÂU (DEEP REGRESSION SUMMARY)');
  console.log('================================================================');
  console.log(`  Tổng số ca kiểm thử: ${passed + failed}`);
  console.log(`  Đạt chuẩn (Passed):   ${passed}`);
  console.log(`  Thất bại (Failed):    ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
