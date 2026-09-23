const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runGeminiAiTest() {
  console.log('================================================================');
  console.log('🤖 KIỂM THỬ TỰ ĐỘNG GEMINI AI AUTO-CATEGORIZATION & SEVERITY PREDICTOR');
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

  // 1. Đăng nhập Admin lấy session cookie
  console.log('--- 🔑 1. ĐĂNG NHẬP ADMIN ---');
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

  // 2. Kịch bản P1: Mã độc / Tấn công tống tiền Ransomware
  console.log('\n--- 🔥 2. KỊCH BẢN P1: AN NINH MẠNG & MÃ ĐỘC TỐNG TIỀN ---');
  try {
    const p1Text = 'Có email lạ gửi hóa đơn, tôi lỡ bấm vào file đính kèm thì màn hình máy tính hiện thông báo đỏ đòi tiền chuộc và toàn bộ file dữ liệu trong ổ D bị khóa mã hóa';
    const res = await fetch(`${BASE_URL}/api/tickets/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: p1Text }),
    });
    assert('Gửi phân tích kịch bản P1 Ransomware HTTP 200', res.ok, `Status: ${res.status}`);
    const json = await res.json();
    assert('API trả về success: true', json.success === true);
    const data = json.data;
    assert('Phát hiện mức ưu tiên URGENT (P1)', data.priority === 'URGENT' || data.priorityLevel === 'P1', `Actual: ${data.priority} (${data.priorityLevel})`);
    assert('Có lý do phân loại mức ưu tiên (priorityReason)', typeof data.priorityReason === 'string' && data.priorityReason.length > 5);
    assert('Có bước hướng dẫn sơ bộ ngắt mạng cô lập', Array.isArray(data.suggestedSteps) && data.suggestedSteps.length > 0);
    console.log(`     ℹ️ Engine: ${data.aiEngine} | Danh mục: ${data.category} | Ưu tiên: ${data.priorityLevel} (${data.priority})`);
    console.log(`     ℹ️ Căn cứ: "${data.priorityReason}"`);
  } catch (e) {
    assert('Kiểm thử Kịch bản P1 thành công', false, e.message);
  }

  // 3. Kịch bản P1: Mất mạng diện rộng toàn công ty
  console.log('\n--- 🌐 3. KỊCH BẢN P1: SỰ CỐ MẠNG DIỆN RỘNG TOÀN CÔNG TY ---');
  try {
    const netText = 'Mạng internet văn phòng bị mất toàn bộ, cả công ty không ai vào được web nội bộ và hệ thống máy chủ bán hàng';
    const res = await fetch(`${BASE_URL}/api/tickets/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: netText }),
    });
    assert('Gửi phân tích kịch bản mất mạng diện rộng HTTP 200', res.ok);
    const json = await res.json();
    const data = json.data;
    assert('Nhận diện chính xác danh mục NETWORK', data.category === 'NETWORK', `Actual: ${data.category}`);
    assert('Đề xuất mức độ URGENT hoặc HIGH (P1/P2)', data.priority === 'URGENT' || data.priority === 'HIGH');
    console.log(`     ℹ️ Engine: ${data.aiEngine} | Danh mục: ${data.category} | Ưu tiên: ${data.priorityLevel} (${data.priority})`);
  } catch (e) {
    assert('Kiểm thử Kịch bản Mạng thành công', false, e.message);
  }

  // 4. Kịch bản P2: Phần mềm Kế toán quan trọng trong kỳ chốt sổ
  console.log('\n--- 📊 4. KỊCH BẢN P2: LỖI PHẦN MỀM KẾ TOÁN CHỐT HÓA ĐƠN GẤP ---');
  try {
    const erpText = 'Phần mềm kế toán MISA bị treo không xuất được hóa đơn điện tử cho khách hàng, hôm nay là hạn cuối quyết toán';
    const res = await fetch(`${BASE_URL}/api/tickets/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: erpText }),
    });
    assert('Gửi phân tích kịch bản ERP MISA HTTP 200', res.ok);
    const json = await res.json();
    const data = json.data;
    assert('Nhận diện chính xác danh mục SOFTWARE', data.category === 'SOFTWARE', `Actual: ${data.category}`);
    assert('Đề xuất mức ưu tiên HIGH (P2)', data.priority === 'HIGH' || data.priorityLevel === 'P2', `Actual: ${data.priority} (${data.priorityLevel})`);
    console.log(`     ℹ️ Engine: ${data.aiEngine} | Dịch vụ: ${data.serviceName} | Ưu tiên: ${data.priorityLevel} (${data.priority})`);
  } catch (e) {
    assert('Kiểm thử Kịch bản P2 thành công', false, e.message);
  }

  // 5. Kịch bản P3: Máy in kẹt giấy (Sự cố phần cứng thông thường)
  console.log('\n--- 🖨️ 5. KỊCH BẢN P3: MÁY IN VĂN PHÒNG KẸT GIẤY ---');
  try {
    const printText = 'Máy in tầng 3 bị kẹt giấy và phát ra tiếng kêu cạch cạch khi bấm in';
    const res = await fetch(`${BASE_URL}/api/tickets/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: printText }),
    });
    assert('Gửi phân tích kịch bản Máy in HTTP 200', res.ok);
    const json = await res.json();
    const data = json.data;
    assert('Nhận diện chính xác danh mục HARDWARE', data.category === 'HARDWARE', `Actual: ${data.category}`);
    assert('Đề xuất mức ưu tiên MEDIUM (P3)', data.priority === 'MEDIUM' || data.priorityLevel === 'P3', `Actual: ${data.priority} (${data.priorityLevel})`);
    console.log(`     ℹ️ Engine: ${data.aiEngine} | Dịch vụ: ${data.serviceName} | Ưu tiên: ${data.priorityLevel} (${data.priority})`);
  } catch (e) {
    assert('Kiểm thử Kịch bản Máy in thành công', false, e.message);
  }

  // 6. Kịch bản P4: Yêu cầu tư vấn / Hướng dẫn không khẩn cấp
  console.log('\n--- 🟢 6. KỊCH BẢN P4: YÊU CẦU TƯ VẤN KHÔNG KHẨN CẤP ---');
  try {
    const lowText = 'Nhờ IT lúc nào rảnh hướng dẫn tôi cách đổi hình nền máy tính và chỉnh font chữ tiếng Việt';
    const res = await fetch(`${BASE_URL}/api/tickets/ai-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({ text: lowText }),
    });
    assert('Gửi phân tích kịch bản P4 HTTP 200', res.ok);
    const json = await res.json();
    const data = json.data;
    assert('Đề xuất mức ưu tiên LOW hoặc MEDIUM (P4/P3)', data.priority === 'LOW' || data.priority === 'MEDIUM');
    console.log(`     ℹ️ Engine: ${data.aiEngine} | Ưu tiên: ${data.priorityLevel} (${data.priority})`);
  } catch (e) {
    assert('Kiểm thử Kịch bản P4 thành công', false, e.message);
  }

  console.log('\n================================================================');
  console.log(`📊 TỔNG KẾT KIỂM THỬ: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runGeminiAiTest().catch((err) => {
  console.error('Fatal error during AI test run:', err);
  prisma.$disconnect();
  process.exit(1);
});
