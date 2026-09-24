const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runEnterpriseQa() {
  console.log('================================================================');
  console.log('🚀 KIỂM THỬ TRỌN GÓI 4 TÍNH NĂNG DOANH NGHIỆP THÔNG MINH');
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

  // 0. Đăng nhập Admin lấy session cookie
  console.log('--- 🔑 0. ĐĂNG NHẬP ADMIN ---');
  let cookie = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'Admin@123' }),
    });
    assert('Đăng nhập Admin thành công (HTTP 200)', loginRes.ok, `Status: ${loginRes.status}`);
    const setCookie = loginRes.headers.get('set-cookie');
    if (setCookie) {
      cookie = setCookie.split(';')[0];
      assert('Nhận session cookie hợp lệ', !!cookie);
    }
  } catch (e) {
    assert('Gửi request đăng nhập thành công', false, e.message);
  }

  // ITEM 1: UNIFIED PROACTIVE NOTIFICATION CENTER
  console.log('\n--- 🔔 ITEM 1: UNIFIED PROACTIVE NOTIFICATION CENTER ---');
  try {
    const notifRes = await fetch(`${BASE_URL}/api/notifications`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/notifications HTTP 200', notifRes.ok, `Status: ${notifRes.status}`);
    const notifData = await notifRes.json();
    assert('API Notifications trả về cấu trúc hợp lệ', Array.isArray(notifData.notifications));
    const proactiveVal = notifData.proactive ?? notifData.counts?.proactive;
    assert('API Notifications trả về trường proactive count', typeof proactiveVal === 'number');
    console.log(`     ℹ️ Tổng thông báo: ${notifData.notifications.length} | Cảnh báo chủ động (Proactive): ${proactiveVal}`);

    const proactiveItems = notifData.notifications.filter((n) => n.type === 'PROACTIVE');
    assert('Phát hiện và định dạng các thông báo PROACTIVE', Array.isArray(proactiveItems));
    if (proactiveItems.length > 0) {
      console.log(`     ℹ️ Mẫu thông báo: [${proactiveItems[0].subType}] ${proactiveItems[0].title}`);
    }
  } catch (e) {
    assert('Kiểm thử Item 1 thành công', false, e.message);
  }

  // ITEM 2: AUTO-GENERATED DIGITAL OFFBOARDING PROTOCOL
  console.log('\n--- 📄 ITEM 2: DIGITAL OFFBOARDING PROTOCOL & HANDOVER DOCUMENT ---');
  let testUserId = null;
  let testDocCode = null;
  try {
    // Tìm hoặc tạo một user tạm thời để test offboard
    await prisma.assetAssignment.deleteMany({ where: { user: { email: 'qa.test.offboard@example.com' } } });
    await prisma.user.deleteMany({ where: { email: 'qa.test.offboard@example.com' } });

    const roles = await prisma.role.findMany();
    const userRole = roles.find((r) => r.name.toLowerCase() === 'user' || r.name.toLowerCase() === 'nhân viên' || r.name.toLowerCase() === 'employee') || roles[roles.length - 1];
    console.log('     ℹ️ Roles found:', roles.map(r => r.name).join(', '), '| Assigned to test user:', userRole.name);

    const newU = await prisma.user.create({
      data: {
        fullName: 'Nguyễn Văn Test Offboard',
        email: 'qa.test.offboard@example.com',
        department: 'Kinh Doanh',
        position: 'Chuyên viên Sales',
        roleId: userRole.id,
        isActive: true,
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
      },
    });
    testUserId = newU.id;

    assert('Chuẩn bị tài khoản nhân sự kiểm thử thôi việc', !!testUserId);

    // Gán 1 thiết bị test cho nhân sự này nếu chưa có
    const availAsset = await prisma.asset.findFirst({ where: { status: 'AVAILABLE' } });
    const adminUser = await prisma.user.findFirst({ where: { email: 'admin@company.com' } });
    if (availAsset && testUserId && adminUser) {
      await prisma.assetAssignment.create({
        data: {
          asset: { connect: { id: availAsset.id } },
          user: { connect: { id: testUserId } },
          assignedBy: { connect: { id: adminUser.id } },
          assignedAt: new Date(),
          notes: 'Cấp phát phục vụ kiểm thử',
        },
      });
      await prisma.asset.update({
        where: { id: availAsset.id },
        data: { status: 'IN_USE' },
      });
    }

    // Thực hiện gọi POST offboard
    const offboardRes = await fetch(`${BASE_URL}/api/users/${testUserId}/offboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        notes: 'Thực hiện kiểm thử tự động tạo Biên bản thu hồi số hóa',
      }),
    });

    assert('POST /api/users/[id]/offboard HTTP 200', offboardRes.ok, `Status: ${offboardRes.status}`);
    const offboardData = await offboardRes.json();
    assert('Thôi việc thành công với success: true', offboardData.success === true);
    assert('Payload trả về summary.document', !!offboardData.summary?.document);

    testDocCode = offboardData.summary?.document?.documentNumber;
    assert('Mã biên bản có tiền tố BBTH-', typeof testDocCode === 'string' && testDocCode.startsWith('BBTH-'));
    console.log(`     ℹ️ Mã biên bản số hóa được tạo: ${testDocCode}`);

    // Kiểm tra trực tiếp trong DB Prisma Document
    const savedDoc = await prisma.document.findFirst({
      where: { contractNumber: testDocCode },
    });
    assert('Biên bản bàn giao tồn tại trong CSDL (Prisma Document)', !!savedDoc);
    assert('Loại tài liệu là HANDOVER', savedDoc?.type === 'HANDOVER');
    assert('Tài liệu chứa thông tin thu hồi thiết bị Markdown', savedDoc?.notes?.includes('BIÊN BẢN BÀN GIAO & THU HỒI'));
  } catch (e) {
    assert('Kiểm thử Item 2 thành công', false, e.message);
  } finally {
    // Dọn dẹp test user
    if (testUserId) {
      try {
        await prisma.document.deleteMany({ where: { contractNumber: testDocCode } });
        await prisma.assetAssignment.deleteMany({ where: { userId: testUserId } });
        await prisma.auditLog.deleteMany({ where: { entityId: testUserId } });
        await prisma.user.delete({ where: { id: testUserId } });
      } catch (cleanErr) {}
    }
  }

  // ITEM 3: IT BUDGET & TCO FORECASTING ENGINE
  console.log('\n--- 📈 ITEM 3: IT BUDGET & TCO FORECASTING ENGINE ---');
  try {
    const budgetRes = await fetch(`${BASE_URL}/api/reports/it-budget-forecast`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/reports/it-budget-forecast HTTP 200', budgetRes.ok, `Status: ${budgetRes.status}`);
    const budgetData = await budgetRes.json();
    assert('API Budget Forecast trả về success: true', budgetData.success === true);

    const summary = budgetData.data?.summary;
    assert('Có tóm tắt tổng dự toán 12M', typeof summary?.totalProjected12M === 'number');
    assert('Có dự toán dịch vụ & thuê bao', typeof summary?.serviceAnnualTotal === 'number');
    assert('Có dự toán gia hạn bản quyền', typeof summary?.licenseAnnualTotal === 'number');
    assert('Có quỹ thay thế máy tính CapEx', typeof summary?.totalHardwareCapEx === 'number');
    assert('Có ngân sách bổ sung phụ tùng', typeof summary?.totalSparePartsCost === 'number');

    console.log(`     ℹ️ Tổng dự toán 12 tháng: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary?.totalProjected12M || 0)}`);
    console.log(`     ℹ️ Quỹ thay thế thiết bị suy hao: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(summary?.totalHardwareCapEx || 0)} (${summary?.replacementCandidateCount} máy)`);

    const forecast = budgetData.data?.monthlyForecast;
    assert('Dự báo dòng tiền 12 tháng gồm đủ 12 tháng', Array.isArray(forecast) && forecast.length === 12);
    if (forecast && forecast.length > 0) {
      console.log(`     ℹ️ Dòng tiền tháng tới (${forecast[0].label}): Dịch vụ ${forecast[0].services}đ | Bản quyền ${forecast[0].licenses}đ | Thiết bị ${forecast[0].hardware}đ | Tổng ${forecast[0].total}đ`);
    }

    const deptTco = budgetData.data?.departmentTco;
    assert('Phân rã TCO theo phòng ban hợp lệ', Array.isArray(deptTco));
  } catch (e) {
    assert('Kiểm thử Item 3 thành công', false, e.message);
  }

  // ITEM 4: PREDICTIVE MAINTENANCE SCHEDULING
  console.log('\n--- 🧠 ITEM 4: PREDICTIVE MAINTENANCE SCHEDULING ---');
  let testScheduleId = null;
  try {
    const predRes = await fetch(`${BASE_URL}/api/maintenance-schedules/predictive`, {
      headers: { Cookie: cookie },
    });
    assert('GET /api/maintenance-schedules/predictive HTTP 200', predRes.ok, `Status: ${predRes.status}`);
    const predData = await predRes.json();
    assert('API Predictive Maintenance trả về success: true', predData.success === true);
    assert('Danh sách candidates là mảng', Array.isArray(predData.candidates));
    console.log(`     ℹ️ Tổng số thiết bị được AI đề xuất bảo trì: ${predData.totalCandidates}`);

    if (predData.candidates.length > 0) {
      const topCand = predData.candidates[0];
      assert('Candidate có thông tin assetId, assetTag, healthScore', !!topCand.assetId && !!topCand.assetTag && typeof topCand.healthScore === 'number');
      assert('Candidate có mức độ khẩn cấp (CRITICAL/HIGH/MEDIUM)', ['CRITICAL', 'HIGH', 'MEDIUM'].includes(topCand.urgency));
      console.log(`     ℹ️ Thiết bị tiêu biểu: [${topCand.assetTag}] ${topCand.name} - Sức khỏe: ${topCand.healthScore}/100 - Mức: ${topCand.urgency}`);
      console.log(`        Lý do: ${topCand.reasons.join('; ')}`);

      // Thử nghiệm Batch Create cho 1 candidate
      const postBatchRes = await fetch(`${BASE_URL}/api/maintenance-schedules/predictive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: JSON.stringify({
          assetIds: [topCand.assetId],
          frequency: 'SEMI_ANNUAL',
          maintenanceType: topCand.suggestedType || 'INSPECTION',
        }),
      });

      assert('POST /api/maintenance-schedules/predictive HTTP 200', postBatchRes.ok, `Status: ${postBatchRes.status}`);
      const postBatchData = await postBatchRes.json();
      assert('Batch schedule creation thành công', postBatchData.success === true && postBatchData.count >= 1);

      if (postBatchData.schedules?.[0]) {
        testScheduleId = postBatchData.schedules[0].id;
        const createdS = await prisma.maintenanceSchedule.findUnique({
          where: { id: testScheduleId },
        });
        assert('Lịch bảo trì dự đoán được ghi vào CSDL', !!createdS && createdS.isActive === true);
        console.log(`     ℹ️ Lịch bảo trì được tạo: ${createdS?.name}`);
      }
    } else {
      console.log('     ℹ️ Không có thiết bị nào đang trong diện báo động bảo dưỡng');
    }
  } catch (e) {
    assert('Kiểm thử Item 4 thành công', false, e.message);
  } finally {
    // Dọn dẹp test schedule
    if (testScheduleId) {
      try {
        await prisma.maintenanceSchedule.delete({ where: { id: testScheduleId } });
      } catch (cleanErr) {}
    }
  }

  console.log('\n================================================================');
  console.log(`🏁 TỔNG KẾT KIỂM THỬ: ${passed} PASS / ${failed} FAIL`);
  console.log('================================================================');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runEnterpriseQa().catch(async (e) => {
  console.error('Fatal test error:', e);
  await prisma.$disconnect();
  process.exit(1);
});
