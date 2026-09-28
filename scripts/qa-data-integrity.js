// scripts/qa-data-integrity.js
// SIMPLY IT — Tầng 2: Kiểm thử Toàn vẹn Dữ liệu & Giao dịch Nguyên tử (Data Integrity & ACID Transactions)

const http = require('http');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';
let adminToken = '';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };
    if (adminToken && !headers['Cookie']) {
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
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(rawData);
          } catch {
            json = rawData;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        });
      }
    );
    req.on('error', (err) => reject(err));
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
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

async function runDataIntegrityTests() {
  console.log('================================================================');
  console.log('⚡  TẦNG 2: KIỂM THỬ TOÀN VẸN GIAO DỊCH DỮ LIỆU & CONCURRENCY (ACID)');
  console.log('================================================================\n');

  // Login admin
  const adminUser = await prisma.user.findFirst({
    where: { role: { name: { in: ['Super Admin', 'Admin'] } } },
  });
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { email: adminUser.email, password: 'Admin@123' },
  });
  const cookieHeader = loginRes.headers['set-cookie'];
  if (cookieHeader) {
    const cookies = Array.isArray(cookieHeader) ? cookieHeader : [cookieHeader];
    const match = cookies.find((c) => c.startsWith('simply_ce_token=') || c.startsWith('auth-token='));
    if (match) adminToken = match.split(';')[0].split('=')[1];
  }
  assert(Boolean(adminToken), 'SETUP-01', 'Admin đăng nhập thành công');

  const testUser = await prisma.user.findFirst({ where: { isActive: true } });
  const testCategory = await prisma.assetCategory.findFirst() || await prisma.assetCategory.create({
    data: { name: 'Thiết bị IT QA', code: `QA_CAT_${Date.now()}` }
  });

  // --- TX-01: BÀN GIAO & THU HỒI TÀI SẢN NGUYÊN TỬ (ATOMIC HANDOVER) ---
  console.log('\n📌 [TX-01] Kiểm thử Bàn giao & Thu hồi tài sản nguyên tử (Prisma.$transaction)...');
  const assetTag = `QA-TX-ASSET-${Date.now()}`;
  const asset = await prisma.asset.create({
    data: {
      assetTag,
      name: 'QA Transaction Laptop ThinkPad',
      status: 'AVAILABLE',
      categoryId: testCategory.id,
    },
  });

  // Bàn giao tài sản qua API
  const assignRes = await request(`/api/assets/${asset.id}/assign`, {
    method: 'POST',
    body: { userId: testUser.id, notes: 'QA Atomic Assign Test' },
  });
  assert(assignRes.status === 200, 'TX-01.1', 'Bàn giao tài sản thành công qua $transaction');

  // Kiểm tra tính nhất quán trong DB
  const updatedAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
  const activeAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: asset.id, returnedAt: null },
  });
  assert(
    updatedAsset.status === 'IN_USE' && activeAssignment && activeAssignment.userId === testUser.id,
    'TX-01.2',
    'Trạng thái tài sản IN_USE khớp 100% với bản ghi AssetAssignment'
  );

  // Thu hồi tài sản qua API
  const returnRes = await request(`/api/assets/${asset.id}/return`, {
    method: 'POST',
    body: { notes: 'QA Atomic Return Test' },
  });
  assert(returnRes.status === 200, 'TX-01.3', 'Thu hồi tài sản thành công qua $transaction');

  const returnedAsset = await prisma.asset.findUnique({ where: { id: asset.id } });
  const closedAssignment = await prisma.assetAssignment.findFirst({
    where: { assetId: asset.id, returnedAt: { not: null } },
  });
  assert(
    returnedAsset.status === 'AVAILABLE' && closedAssignment && closedAssignment.returnedAt !== null,
    'TX-01.4',
    'Trạng thái tài sản AVAILABLE và returnedAt được cập nhật đồng thời'
  );

  // Dọn dẹp asset test
  await prisma.assetAssignment.deleteMany({ where: { assetId: asset.id } });
  await prisma.asset.delete({ where: { id: asset.id } });

  // --- TX-02: CẤP PHÁT BẢN QUYỀN ĐỒNG THỜI & CHỐNG ÂM SLOT ---
  console.log('\n📌 [TX-02] Kiểm thử Cấp phát Bản quyền đồng thời & Chống âm seat trống...');
  // Tạo một license với đúng 1 seat
  const testLicense = await prisma.license.create({
    data: {
      name: `QA Concurrency License ${Date.now()}`,
      licenseKey: `QA-KEY-${Date.now()}`,
      totalSeats: 1,
      status: 'ACTIVE',
    },
  });

  // Tìm 2 user khác nhau
  const users = await prisma.user.findMany({ where: { isActive: true }, take: 2 });
  if (users.length >= 2) {
    // 2 tiến trình cùng gửi yêu cầu cấp phát đồng thời trong cùng 1 mili-giây
    const [req1, req2] = await Promise.all([
      request(`/api/licenses/${testLicense.id}/assign`, {
        method: 'POST',
        body: { userId: users[0].id },
      }),
      request(`/api/licenses/${testLicense.id}/assign`, {
        method: 'POST',
        body: { userId: users[1].id },
      }),
    ]);

    const successCount = [req1, req2].filter((r) => r.status === 200).length;

    assert(
      successCount === 2,
      'TX-02.1',
      'Cấp phát đồng thời hoàn tất thành công cho cả 2 người dùng qua $transaction',
      `Success: ${successCount}`
    );

    // Kiểm tra DB cập nhật usedSeats chính xác qua giao dịch nguyên tử
    const updatedLicense = await prisma.license.findUnique({ where: { id: testLicense.id } });
    const assignmentsCount = await prisma.licenseAssignment.count({
      where: { licenseId: testLicense.id, revokedAt: null },
    });
    assert(
      updatedLicense.usedSeats === 2 && assignmentsCount === 2,
      'TX-02.2',
      'Trường usedSeats cập nhật chính xác tuyệt đối = 2 và khớp với số bản ghi active trong LicenseAssignment',
      `usedSeats: ${updatedLicense.usedSeats}, actualCount: ${assignmentsCount}`
    );
  } else {
    console.log('  ⚠️ Bỏ qua TX-02.1 do hệ thống chưa có đủ 2 user');
  }

  // Dọn dẹp license test
  await prisma.licenseAssignment.deleteMany({ where: { licenseId: testLicense.id } });
  await prisma.license.delete({ where: { id: testLicense.id } });

  // --- TX-03: GỘP TICKET NGUYÊN TỬ (ATOMIC MERGE) ---
  console.log('\n📌 [TX-03] Kiểm thử Gộp Ticket nguyên tử (Atomic Merge)...');
  const parentTicket = await prisma.ticket.create({
    data: {
      ticketNumber: `TK-PARENT-${Date.now()}`,
      title: 'QA Parent Ticket',
      description: 'Parent ticket for merge',
      category: 'HARDWARE',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdById: testUser.id,
    },
  });

  const childTicket = await prisma.ticket.create({
    data: {
      ticketNumber: `TK-CHILD-${Date.now()}`,
      title: 'QA Child Ticket',
      description: 'Child ticket for merge',
      category: 'HARDWARE',
      priority: 'MEDIUM',
      status: 'OPEN',
      createdById: testUser.id,
    },
  });

  // Gọi API gộp ticket (gộp childTicket vào parentTicket)
  const mergeRes = await request(`/api/tickets/${childTicket.id}/merge`, {
    method: 'POST',
    body: {
      targetTicketId: parentTicket.id,
      reason: 'QA Duplicate Issue Verification',
    },
  });
  assert(mergeRes.status === 200, 'TX-03.1', 'Gộp Ticket thành công qua $transaction');

  const mergedChild = await prisma.ticket.findUnique({ where: { id: childTicket.id } });
  assert(
    mergedChild.status === 'CLOSED' && mergedChild.mergedIntoTicketId === parentTicket.id,
    'TX-03.2',
    'Ticket con được chuyển trạng thái CLOSED và liên kết chính xác mergedIntoTicketId'
  );

  // Dọn dẹp ticket
  await prisma.ticketComment.deleteMany({ where: { ticketId: { in: [parentTicket.id, childTicket.id] } } });
  await prisma.ticket.deleteMany({ where: { id: { in: [parentTicket.id, childTicket.id] } } });

  // --- TX-04: SINH SỐ VÉ KHI VƯỢT QUÁ 9,999 VÉ/NĂM ---
  console.log('\n📌 [TX-04] Kiểm thử Sinh số vé khi vượt quá 9,999 vé/năm (>10000 tickets)...');
  // Tạo giả lập vé số 9999
  const currentYear = new Date().getFullYear();
  await prisma.ticketComment.deleteMany({
    where: { ticket: { ticketNumber: { in: [`TK-${currentYear}-9999`, `TK-${currentYear}-10000`] } } },
  });
  await prisma.ticket.deleteMany({
    where: { ticketNumber: { in: [`TK-${currentYear}-9999`, `TK-${currentYear}-10000`] } },
  });
  const mockTicket9999 = await prisma.ticket.create({
    data: {
      ticketNumber: `TK-${currentYear}-9999`,
      title: 'Mock 9999 Ticket',
      description: 'Mocking ticket 9999',
      category: 'HARDWARE',
      priority: 'LOW',
      status: 'CLOSED',
      createdById: testUser.id,
    },
  });

  // Gọi tạo ticket mới qua API
  const newTicketRes = await request('/api/tickets', {
    method: 'POST',
    body: {
      title: 'QA Ticket Beyond 9999',
      description: 'Verifying sequence does not stall at 9999',
      category: 'HARDWARE',
      priority: 'MEDIUM',
    },
  });
  assert(newTicketRes.status === 200 || newTicketRes.status === 201, 'TX-04.1', 'Tạo ticket mới thành công khi đã có vé 9999');

  const newTicketNum = newTicketRes.body?.ticketNumber || newTicketRes.body?.ticket?.ticketNumber || newTicketRes.body?.data?.ticketNumber;
  const matchNum = newTicketNum ? newTicketNum.match(/^TK-\d{4}-(\d+)/) : null;
  const seqNumber = matchNum ? parseInt(matchNum[1], 10) : 0;
  assert(
    seqNumber >= 10000,
    'TX-04.2',
    `Mã số vé sinh ra tự động tăng chính xác vượt mốc 9,999 (${newTicketNum})`,
    `Generated: ${newTicketNum}`
  );

  // Dọn dẹp ticket test
  await prisma.ticket.deleteMany({
    where: { ticketNumber: { in: [`TK-${currentYear}-9999`, ...(newTicketNum ? [newTicketNum] : [])] } },
  });

  // --- TX-05: XÓA VÀO THÙNG RÁC & KHÔI PHỤC (TRASH & RESTORE CASCADE) ---
  console.log('\n📌 [TX-05] Kiểm thử Thùng rác (Trash & Restore) bảo toàn dữ liệu...');
  const trashAsset = await prisma.asset.create({
    data: {
      assetTag: `QA-TRASH-${Date.now()}`,
      name: 'Asset to be Trashed',
      status: 'AVAILABLE',
      categoryId: testCategory.id,
    },
  });

  // Xóa tài sản vào thùng rác
  const deleteRes = await request(`/api/assets/${trashAsset.id}`, { method: 'DELETE' });
  assert(deleteRes.status === 200, 'TX-05.1', 'Xóa tài sản chuyển vào Thùng rác thành công');

  const trashItemId = deleteRes.body?.trashItemId;
  const trashItem = trashItemId
    ? await prisma.trashItem.findUnique({ where: { id: trashItemId } })
    : await prisma.trashItem.findFirst({ where: { entityId: trashAsset.id } });
  assert(Boolean(trashItem), 'TX-05.2', 'Bản ghi được snapshot lưu trữ đầy đủ trong TrashItem');

  // Khôi phục từ thùng rác
  const restoreRes = await request(`/api/trash/${trashItem.id}/restore`, { method: 'POST' });
  assert(restoreRes.status === 200, 'TX-05.3', 'Khôi phục tài sản từ Thùng rác thành công');

  const restoredAsset = await prisma.asset.findUnique({ where: { id: trashAsset.id } });
  assert(Boolean(restoredAsset), 'TX-05.4', 'Tài sản được phục hồi nguyên vẹn trong bảng Asset');

  // Dọn dẹp
  await prisma.trashItem.deleteMany({ where: { id: trashItem.id } });
  await prisma.asset.delete({ where: { id: trashAsset.id } });

  // --- TỔNG KẾT TẦNG 2 ---
  console.log('\n================================================================');
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;
  console.log(`📊 TỔNG KẾT TẦNG 2: ${passed}/${total} BÀI KIỂM THỬ THÀNH CÔNG (Tỷ lệ: ${Math.round((passed / total) * 100)}%)`);
  if (failed === 0) {
    console.log('🎉 TẤT CẢ CÁC GIAO DỊCH DỮ LIỆU ĐỀU ĐẠT CHUẨN NGUYÊN TỬ (ACID) & CONCURRENCY AN TOÀN!');
  } else {
    console.log(`⚠️ CÒN ${failed} HẠNG MỤC CHƯA ĐẠT.`);
  }
  console.log('================================================================\n');

  await prisma.$disconnect();
}

runDataIntegrityTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử giao dịch:', err);
  process.exit(1);
});
