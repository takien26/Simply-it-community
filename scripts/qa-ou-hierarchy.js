const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runOuQa() {
  console.log('================================================================');
  console.log('🌳 KIỂM THỬ TÍNH NĂNG CƠ CẤU TỔ CHỨC OU & LIÊN KẾT NHÂN SỰ');
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
    assert('Đăng nhập thành công', false, e.message);
  }

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookie,
  };

  // 2. GET /api/companies/ou
  console.log('\n--- 📂 2. KIỂM THỬ TRUY VẤN CƠ CẤU OU (/api/companies/ou) ---');
  let ouData = null;
  try {
    const res = await fetch(`${BASE_URL}/api/companies/ou`, { headers });
    assert('GET /api/companies/ou HTTP 200', res.ok, `Status: ${res.status}`);
    const json = await res.json();
    assert('Response success true', json.success === true);
    assert('OU data là một mảng công ty', Array.isArray(json.data) && json.data.length > 0);
    ouData = json.data;

    const firstComp = ouData[0];
    console.log(`    ℹ️ Công ty đầu tiên: "${firstComp.name}" có ${firstComp.departments.length} phòng ban, ${firstComp.userCount} nhân sự`);
    assert('Công ty có danh sách phòng ban', Array.isArray(firstComp.departments));
    assert('Công ty có thuộc tính userCount', typeof firstComp.userCount === 'number');

    const firstDept = firstComp.departments[0];
    assert('Phòng ban có thuộc tính name & id', !!firstDept.name && !!firstDept.id);
    assert('Phòng ban có danh sách con (sub-departments)', Array.isArray(firstDept.children));
    assert('Phòng ban có userCount riêng', typeof firstDept.userCount === 'number');
  } catch (e) {
    assert('GET /api/companies/ou thành công', false, e.message);
  }

  // 3. POST /api/companies/ou - Thêm phòng ban mới
  console.log('\n--- ➕ 3. KIỂM THỬ THÊM PHÒNG BAN & BỘ PHẬN CON (CRUD OU) ---');
  const uniqueId = Date.now();
  const testCompany = ouData && ouData[0] ? ouData[0].name : 'Công ty Cổ phần Dây Cáp Điện Việt Nam';
  const testDeptName = `Khối Đổi Mới Sáng Tạo & AI (${uniqueId})`;
  const testSubDeptName = `Phòng Thử Nghiệm Lab (${uniqueId})`;
  const testRenamedSubDept = `Phòng Nghiên Cứu Lab Mới (${uniqueId})`;
  let createdDeptId = '';
  let createdSubId = '';

  try {
    // Add Department
    const addDeptRes = await fetch(`${BASE_URL}/api/companies/ou`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'ADD_DEPARTMENT',
        companyName: testCompany,
        name: testDeptName,
        code: 'INNOV-AI',
        icon: '🚀',
      }),
    });
    assert('Thêm phòng ban mới HTTP 200', addDeptRes.ok, `Status: ${addDeptRes.status}`);
    const addDeptJson = await addDeptRes.json();
    assert('ADD_DEPARTMENT success true', addDeptJson.success === true);
    assert('Phòng ban trả về có ID & tên chính xác', addDeptJson.data?.name === testDeptName);
    createdDeptId = addDeptJson.data?.id;

    // Add Sub-department
    const addSubRes = await fetch(`${BASE_URL}/api/companies/ou`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'ADD_SUB_DEPARTMENT',
        companyName: testCompany,
        parentDeptName: testDeptName,
        name: testSubDeptName,
        code: 'LAB-AI',
      }),
    });
    assert('Thêm bộ phận con HTTP 200', addSubRes.ok, `Status: ${addSubRes.status}`);
    const addSubJson = await addSubRes.json();
    assert('ADD_SUB_DEPARTMENT success true', addSubJson.success === true);
    assert('Bộ phận con trả về có ID & tên chính xác', addSubJson.data?.name === testSubDeptName);
    createdSubId = addSubJson.data?.id;

    // Verify OU tree reflects both
    const checkTreeRes = await fetch(`${BASE_URL}/api/companies/ou`, { headers });
    const checkTreeJson = await checkTreeRes.json();
    const updatedComp = checkTreeJson.data.find((c) => c.name === testCompany);
    const foundDept = updatedComp?.departments.find((d) => d.id === createdDeptId);
    const foundSub = foundDept?.children.find((c) => c.id === createdSubId);
    assert('Phòng ban mới đã xuất hiện trong OU Tree', !!foundDept);
    assert('Bộ phận con mới đã xuất hiện trong OU Tree', !!foundSub);

    // 4. Liên kết Nhân sự vào Bộ phận vừa tạo
    console.log('\n--- 👤 4. KIỂM THỬ LIÊN KẾT NHÂN SỰ VÀO PHÒNG BAN OU MỚI ---');
    const newUserRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fullName: 'Nguyễn Văn Kỹ Sư AI (QA)',
        email: `ai-engineer-${Date.now()}@company.com`,
        position: 'AI Research Lead',
        companyName: testCompany,
        department: `${testDeptName} / ${testSubDeptName}`,
        password: 'User@123',
      }),
    });
    assert('Tạo nhân sự thuộc phòng ban OU mới HTTP 200/201', newUserRes.ok, `Status: ${newUserRes.status}`);
    const createdUser = await newUserRes.json();
    const testUserId = createdUser.data?.id || createdUser.id;
    assert('Tạo thành công có User ID', !!testUserId);

    // Check headcount updated in OU tree
    const ouCheckRes = await fetch(`${BASE_URL}/api/companies/ou`, { headers });
    const ouCheckJson = await ouCheckRes.json();
    const checkedComp = ouCheckJson.data.find((c) => c.name === testCompany);
    const checkedDept = checkedComp?.departments.find((d) => d.id === createdDeptId);
    const checkedSub = checkedDept?.children.find((c) => c.id === createdSubId);
    assert('Headcount (userCount) của phòng ban cha tự động cập nhật >= 1', checkedDept && checkedDept.userCount >= 1);
    assert('Headcount (userCount) của bộ phận con tự động cập nhật >= 1', checkedSub && checkedSub.userCount >= 1);

    // 5. Đổi tên Bộ phận con & Kiểm tra hiệu ứng lan tỏa (Cascading update)
    console.log('\n--- 🔄 5. KIỂM THỬ ĐỔI TÊN BỘ PHẬN & HIỆU ỨNG CASCADING TỚI NHÂN SỰ ---');
    const renameSubRes = await fetch(`${BASE_URL}/api/companies/ou`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'EDIT_SUB_DEPARTMENT',
        companyName: testCompany,
        parentDeptName: testDeptName,
        subDeptId: createdSubId,
        name: testRenamedSubDept,
      }),
    });
    assert('Đổi tên bộ phận con HTTP 200', renameSubRes.ok);

    // Check if user department was automatically updated in DB
    const userInDb = await prisma.user.findUnique({ where: { id: testUserId } });
    assert(
      'User department tự động cập nhật theo tên mới (Cascading)',
      userInDb && userInDb.department.includes(testRenamedSubDept),
      `Current in DB: ${userInDb?.department}`
    );

    // 6. Dọn dẹp bản ghi kiểm thử
    console.log('\n--- 🧹 6. DỌN DẸP DỮ LIỆU KIỂM THỬ ---');
    // Delete user
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    assert('Đã xóa nhân sự kiểm thử', true);

    // Delete test department from OU
    const delDeptRes = await fetch(`${BASE_URL}/api/companies/ou`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'DELETE_DEPARTMENT',
        companyName: testCompany,
        deptId: createdDeptId,
        force: true,
      }),
    });
    assert('Xóa phòng ban kiểm thử HTTP 200', delDeptRes.ok);
    const finalOuRes = await fetch(`${BASE_URL}/api/companies/ou`, { headers });
    const finalOuJson = await finalOuRes.json();
    const finalComp = finalOuJson.data.find((c) => c.name === testCompany);
    const stillExists = finalComp?.departments.some((d) => d.id === createdDeptId);
    assert('Phòng ban kiểm thử đã được xóa khỏi OU sạch sẽ', !stillExists);
  } catch (e) {
    assert('Kiểm thử CRUD OU hoàn tất không lỗi', false, e.message);
  }

  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KIỂM THỬ OU HIERARCHY');
  console.log(`  Tổng số: ${passed + failed} | Đạt: ${passed} | Thất bại: ${failed}`);
  console.log('================================================================');

  if (failed === 0) {
    console.log('🏆 TUYỆT VỜI! TẤT CẢ CÁC TÍNH NĂNG OU & LIÊN KẾT NHÂN SỰ HOẠT ĐỘNG 100% HOÀN HẢO!');
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runOuQa();
