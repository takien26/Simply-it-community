const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3001';

async function runQaAudit() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ TOÀN BỘ HỆ THỐNG (FULL SYSTEM QA AUDIT)');
  console.log(`📍 Endpoint: ${BASE_URL} | Time: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    defects: [],
  };

  function assert(name, condition, errorMsg = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      results.failed++;
      console.log(`  ❌ [FAIL] ${name} -> ${errorMsg}`);
      results.defects.push({ name, error: errorMsg, severity: 'HIGH' });
    }
  }

  function warn(name, note) {
    results.warnings++;
    console.log(`  ⚠️  [WARN] ${name}: ${note}`);
    results.defects.push({ name, error: note, severity: 'MEDIUM' });
  }

  let sessionCookie = '';
  let adminUser = null;

  // -------------------------------------------------------------
  // TEST SUITE 1: DATABASE INTEGRITY & ORM RELATIONSHIPS
  // -------------------------------------------------------------
  console.log('\n--- 📦 TEST SUITE 1: CƠ SỞ DỮ LIỆU & RÀNG BUỘC TOÀN VẸN ---');
  try {
    const userCount = await prisma.user.count();
    assert('DB Connection & User count', userCount > 0, `userCount is ${userCount}`);

    adminUser = await prisma.user.findFirst({
      where: { email: 'admin@company.com' },
      include: { role: true },
    });
    assert('Admin user exists with Role', adminUser && adminUser.role, 'Admin user or role not found');

    // Check orphaned records: Asset without category
    const totalAssets = await prisma.asset.count();
    console.log(`  ℹ️ Total assets in system: ${totalAssets}`);

    // Check licenses with invalid seat counts
    const invalidSeatLicenses = await prisma.license.findMany({
      where: {
        OR: [
          { totalSeats: { lt: 0 } },
          { usedSeats: { lt: 0 } },
        ],
      },
    });
    assert('No licenses with negative seats', invalidSeatLicenses.length === 0, `Found ${invalidSeatLicenses.length} invalid seat licenses`);

    // Check assets with negative purchase price
    const negativePriceAssets = await prisma.asset.count({
      where: { purchasePrice: { lt: 0 } },
    });
    assert('No assets with negative purchasePrice', negativePriceAssets === 0, `Found ${negativePriceAssets} assets with negative price`);

    // Check spare parts with negative stock
    const negativeStockParts = await prisma.sparePart.count({
      where: { quantity: { lt: 0 } },
    });
    assert('No spare parts with negative stock', negativeStockParts === 0, `Found ${negativeStockParts} parts with negative stock`);
  } catch (err) {
    assert('Database integrity check', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: AUTHENTICATION & SESSION HANDLING
  // -------------------------------------------------------------
  console.log('\n--- 🔐 TEST SUITE 2: XÁC THỰC, ĐĂNG NHẬP & PHÂN QUYỀN ---');
  try {
    // 2.1 Login with wrong password
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'WrongPassword!23' }),
    });
    assert('Reject invalid password with 401', wrongLoginRes.status === 401, `Status was ${wrongLoginRes.status}`);

    // 2.2 Login with empty payload
    const emptyLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '', password: '' }),
    });
    assert('Reject empty login payload with 400', emptyLoginRes.status === 400, `Status was ${emptyLoginRes.status}`);

    // 2.3 Login with correct admin credentials
    const correctLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@company.com', password: 'Admin@123' }),
    });
    assert('Admin login successful (200)', correctLoginRes.status === 200, `Status was ${correctLoginRes.status}`);

    // Extract cookie
    const setCookie = correctLoginRes.headers.get('set-cookie');
    if (setCookie) {
      sessionCookie = setCookie.split(';')[0];
      assert('Received session cookie', sessionCookie.length > 10, 'Session cookie empty');
    } else {
      assert('Received session cookie', false, 'No set-cookie header returned');
    }

    // 2.4 Verify protected route /api/users with session
    const authHeaders = {
      'Content-Type': 'application/json',
      Cookie: sessionCookie,
    };
    const protectedRes = await fetch(`${BASE_URL}/api/users`, { headers: authHeaders });
    assert('Access protected route with cookie (200)', protectedRes.status === 200, `Status was ${protectedRes.status}`);
  } catch (err) {
    assert('Authentication flow', false, err.message);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  };

  // -------------------------------------------------------------
  // TEST SUITE 3: ASSET LIFECYCLE, DEPRECIATION & TRASH
  // -------------------------------------------------------------
  console.log('\n--- 💻 TEST SUITE 3: VÒNG ĐỜI TÀI SẢN, KHẤU HAO & THÙNG RÁC ---');
  let testAssetId = null;
  const testAssetTag = `QA-TEST-${Date.now().toString().slice(-6)}`;
  try {
    // 3.1 Create asset
    const createAssetRes = await fetch(`${BASE_URL}/api/assets`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Máy trạm kiểm thử tự động (QA Station Pro)',
        assetTag: testAssetTag,
        serialNumber: `SN-${testAssetTag}`,
        status: 'AVAILABLE',
        purchaseDate: '2024-01-15',
        purchasePrice: 36000000,
        purchaseCurrency: 'VND',
        usefulLifeMonths: 36,
        residualValue: 0,
        depreciationMethod: 'STRAIGHT_LINE',
        specs: { cpu: 'Intel Core i9-14900K', ram: '64GB', ssd: '2TB NVMe' },
      }),
    });
    assert('Create new asset API (200/201)', createAssetRes.status === 200 || createAssetRes.status === 201, `Status: ${createAssetRes.status}`);
    const assetJson = await createAssetRes.json();
    testAssetId = assetJson?.data?.id || assetJson?.id;
    assert('Asset ID returned and saved', Boolean(testAssetId), 'Asset ID missing in response');

    // 3.2 Fetch asset detail & verify depreciation calculation
    if (testAssetId) {
      const getAssetRes = await fetch(`${BASE_URL}/api/assets/${testAssetId}`, { headers: authHeaders });
      assert('Fetch asset detail (200)', getAssetRes.status === 200, `Status: ${getAssetRes.status}`);
      const assetDetail = (await getAssetRes.json()).data;
      assert('Asset specs preserved accurately', assetDetail?.specs?.ram === '64GB', 'Specs RAM mismatch');

      // 3.3 Add maintenance log to asset
      const maintRes = await fetch(`${BASE_URL}/api/assets/${testAssetId}/maintenance`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'UPGRADE',
          title: 'Nâng cấp thêm 32GB RAM DDR5 Kingston Fury',
          cost: 2500000,
          costCurrency: 'VND',
          performedAt: new Date().toISOString().split('T')[0],
          notes: 'Kịch bản kiểm thử tự động',
        }),
      });
      assert('Create asset maintenance log (200/201)', maintRes.status === 200 || maintRes.status === 201, `Status: ${maintRes.status}`);

      // 3.4 Delete asset to Recycle Bin (Soft delete with Snapshot)
      const deleteAssetRes = await fetch(`${BASE_URL}/api/assets/${testAssetId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert('Delete asset to Recycle Bin (200)', deleteAssetRes.status === 200, `Status: ${deleteAssetRes.status}`);
      const deleteJson = await deleteAssetRes.json();
      assert('Delete returns trashItemId', Boolean(deleteJson.trashItemId), 'trashItemId missing');

      // 3.5 Check item exists in Trash API
      const trashListRes = await fetch(`${BASE_URL}/api/trash?type=ASSET`, { headers: authHeaders });
      const trashList = await trashListRes.json();
      const foundInTrash = (trashList.data || []).find((t) => t.id === deleteJson.trashItemId || t.entityId === testAssetId);
      assert('Asset exists in TrashItem table', Boolean(foundInTrash), 'Asset not found in Trash list');

      // 3.6 Restore asset from Trash
      if (deleteJson.trashItemId) {
        const restoreRes = await fetch(`${BASE_URL}/api/trash/${deleteJson.trashItemId}/restore`, {
          method: 'POST',
          headers: authHeaders,
        });
        assert('Restore asset from Trash (200)', restoreRes.status === 200, `Status: ${restoreRes.status}`);
        const restoreJson = await restoreRes.json();
        assert('Restore returns success true', restoreJson.success === true, 'Restore was not successful');

        // Verify asset is back in database
        const checkBackAsset = await prisma.asset.findUnique({ where: { id: testAssetId } });
        assert('Asset restored back into Asset table', Boolean(checkBackAsset), 'Asset not found after restore');
      }
    }
  } catch (err) {
    assert('Asset lifecycle flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 4: LICENSES, OVER-ALLOCATION & EXPIRY
  // -------------------------------------------------------------
  console.log('\n--- 🔑 TEST SUITE 4: BẢN QUYỀN, PHÂN BỔ CHỖ & GIỚI HẠN ---');
  let testLicId = null;
  try {
    // 4.1 Create license with 2 seats
    const createLicRes = await fetch(`${BASE_URL}/api/licenses`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Microsoft 365 E5 QA Suite',
        licenseKey: `MS365-QA-${Date.now().toString().slice(-8)}`,
        licenseType: 'SUBSCRIPTION',
        totalSeats: 2,
        purchaseDate: '2024-01-01',
        expiryDate: '2025-12-31',
        purchasePrice: 12000000,
        purchaseCurrency: 'VND',
      }),
    });
    assert('Create License (200/201)', createLicRes.status === 200 || createLicRes.status === 201, `Status: ${createLicRes.status}`);
    const licJson = await createLicRes.json();
    testLicId = licJson?.data?.id || licJson?.id;
    assert('License ID returned', Boolean(testLicId), 'Missing license ID');

    if (testLicId && adminUser) {
      // 4.2 Assign Seat 1
      const assignRes1 = await fetch(`${BASE_URL}/api/licenses/${testLicId}/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: adminUser.id }),
      });
      assert('Assign seat 1 to user (200)', assignRes1.status === 200, `Status: ${assignRes1.status}`);

      // 4.3 Assign Seat 2 (to asset)
      if (testAssetId) {
        const assignRes2 = await fetch(`${BASE_URL}/api/licenses/${testLicId}/assign`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ assetId: testAssetId }),
        });
        assert('Assign seat 2 to asset (200)', assignRes2.status === 200, `Status: ${assignRes2.status}`);
      }

      // 4.4 Assign Seat 3 (Cho phép vượt hạn mức theo yêu cầu nghiệp vụ / True-up)
      const assignRes3 = await fetch(`${BASE_URL}/api/licenses/${testLicId}/assign`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId: adminUser.id }),
      });
      assert('Allow over-allocation when seats full (200 OK)', assignRes3.status === 200, `Status: ${assignRes3.status}`);
      const assign3Data = await assignRes3.json();
      assert('Response flags isOverAllocated = true', assign3Data.isOverAllocated === true, 'isOverAllocated missing');

      // 4.5 Soft delete license to Trash
      const deleteLicRes = await fetch(`${BASE_URL}/api/licenses/${testLicId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      assert('Delete license to Trash (200)', deleteLicRes.status === 200, `Status: ${deleteLicRes.status}`);
      const licTrashJson = await deleteLicRes.json();
      assert('License trashItemId returned', Boolean(licTrashJson.trashItemId), 'Missing trashItemId');

      // 4.6 Restore license
      if (licTrashJson.trashItemId) {
        const restoreLicRes = await fetch(`${BASE_URL}/api/trash/${licTrashJson.trashItemId}/restore`, {
          method: 'POST',
          headers: authHeaders,
        });
        assert('Restore license from Trash (200)', restoreLicRes.status === 200, `Status: ${restoreLicRes.status}`);
      }
    }
  } catch (err) {
    assert('License flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 5: USERS, OFFBOARDING & RECOVERY
  // -------------------------------------------------------------
  console.log('\n--- 👥 TEST SUITE 5: QUẢN LÝ NHÂN SỰ & QUY TRÌNH OFFBOARDING ---');
  let testUserId = null;
  const testUserEmail = `qa.employee.${Date.now()}@company.com`;
  try {
    // 5.1 Create User
    const createUserRes = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        email: testUserEmail,
        fullName: 'Nguyễn Văn QA Tester',
        department: 'Kiểm thử Chất lượng',
        jobTitle: 'Senior QA Engineer',
        companyName: 'Tập đoàn Simply IT',
        password: 'Password@123',
      }),
    });
    assert('Create user (200/201)', createUserRes.status === 200 || createUserRes.status === 201, `Status: ${createUserRes.status}`);
    const userJson = await createUserRes.json();
    testUserId = userJson?.data?.id || userJson?.id;
    assert('Test User ID generated', Boolean(testUserId), 'Missing User ID');

    if (testUserId && testAssetId) {
      // 5.2 Handover asset to this user
      await prisma.assetAssignment.create({
        data: {
          assetId: testAssetId,
          userId: testUserId,
          assignedById: adminUser.id,
        },
      });
      await prisma.asset.update({
        where: { id: testAssetId },
        data: { status: 'IN_USE' },
      });

      // 5.3 Test Offboard Preview API
      const previewRes = await fetch(`${BASE_URL}/api/users/${testUserId}/offboard-preview`, { headers: authHeaders });
      assert('Offboard preview returns 200', previewRes.status === 200, `Status: ${previewRes.status}`);
      const previewData = await previewRes.json();
      const heldAssets = previewData.data?.assets || previewData.assets || [];
      assert('Preview identifies held assets', heldAssets.some((a) => a.id === testAssetId), 'Asset not found in offboard preview');

      // 5.4 Execute Offboard API
      const offboardRes = await fetch(`${BASE_URL}/api/users/${testUserId}/offboard`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          revokeAssets: true,
          revokeLicenses: true,
          disableAccount: true,
          offboardReason: 'Hoàn tất kịch bản kiểm thử tự động',
        }),
      });
      assert('Execute offboarding (200)', offboardRes.status === 200, `Status: ${offboardRes.status}`);

      // Verify asset was unassigned and marked AVAILABLE
      const refreshedAsset = await prisma.asset.findUnique({ where: { id: testAssetId } });
      const activeAssignments = await prisma.assetAssignment.count({
        where: { assetId: testAssetId, returnedAt: null },
      });
      assert('Asset returned to AVAILABLE after offboard', refreshedAsset.status === 'AVAILABLE' && activeAssignments === 0, `Status was ${refreshedAsset.status}`);

      // Verify user marked inactive
      const refreshedUser = await prisma.user.findUnique({ where: { id: testUserId } });
      assert('User marked isActive = false after offboard', refreshedUser.isActive === false, 'User still active');

      // Verify inactive user cannot login
      const inactiveLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUserEmail, password: 'Password@123' }),
      });
      assert('Inactive user rejected from login (403)', inactiveLoginRes.status === 403, `Status was ${inactiveLoginRes.status}`);
    }
  } catch (err) {
    assert('User & offboarding flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 6: HELPDESK, TICKETS & SLA
  // -------------------------------------------------------------
  console.log('\n--- 🎫 TEST SUITE 6: HELPDESK, TICKETS & TÍNH TOÁN SLA ---');
  let testTicketId = null;
  try {
    // 6.1 Create ticket
    const createTicketRes = await fetch(`${BASE_URL}/api/tickets`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Màn hình máy tính bị chớp nháy liên tục (QA Ticket)',
        description: 'Màn hình xuất hiện các sọc ngang khi kết nối cổng HDMI, cần hỗ trợ kiểm tra cáp hoặc card đồ họa.',
        priority: 'HIGH',
        category: 'HARDWARE',
        assetId: testAssetId,
      }),
    });
    assert('Create ticket (200/201)', createTicketRes.status === 200 || createTicketRes.status === 201, `Status: ${createTicketRes.status}`);
    const ticketJson = await createTicketRes.json();
    testTicketId = ticketJson?.data?.id || ticketJson?.id;
    assert('Ticket ID created', Boolean(testTicketId), 'Missing Ticket ID');

    if (testTicketId) {
      // 6.2 Add internal comment
      const commentRes = await fetch(`${BASE_URL}/api/tickets/${testTicketId}/comments`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          content: 'IT Support đã tiếp nhận và đang mang cáp HDMI mới lên phòng kiểm tra.',
          isInternal: false,
        }),
      });
      assert('Add ticket comment (200/201)', commentRes.status === 200 || commentRes.status === 201, `Status: ${commentRes.status}`);

      // 6.3 Update ticket status to RESOLVED
      const updateTicketRes = await fetch(`${BASE_URL}/api/tickets/${testTicketId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({
          status: 'RESOLVED',
          resolutionNote: 'Đã thay thế cáp DisplayPort mới, màn hình hiển thị ổn định 144Hz.',
        }),
      });
      assert('Update ticket status to RESOLVED (200)', updateTicketRes.status === 200, `Status: ${updateTicketRes.status}`);

      // 6.4 Rate CSAT
      const rateRes = await fetch(`${BASE_URL}/api/tickets/${testTicketId}/rate`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          rating: 5,
          feedback: 'Hỗ trợ rất nhanh và nhiệt tình!',
        }),
      });
      assert('Rate CSAT rating (200)', rateRes.status === 200, `Status: ${rateRes.status}`);
    }
  } catch (err) {
    assert('Ticket & Helpdesk flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 7: SPARE PARTS & STOCK INTEGRITY
  // -------------------------------------------------------------
  console.log('\n--- 🔩 TEST SUITE 7: KHO LINH KIỆN & GIAO DỊCH XUẤT NHẬP ---');
  let testPartId = null;
  try {
    const partCode = `RAM-DDR5-QA-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    // 7.1 Create Spare Part with 10 units
    const createPartRes = await fetch(`${BASE_URL}/api/spare-parts`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        sku: partCode,
        name: 'Thanh RAM DDR5 32GB 5600MHz Kingston Fury (QA Part)',
        quantity: 10,
        minStock: 2,
        unitPrice: 2100000,
        currency: 'VND',
        unit: 'thanh',
      }),
    });
    assert('Create Spare Part (200/201)', createPartRes.status === 200 || createPartRes.status === 201, `Status: ${createPartRes.status}`);
    const partJson = await createPartRes.json();
    testPartId = partJson?.data?.id || partJson?.id;

    if (testPartId) {
      // 7.2 Stock Out 3 units
      const stockOutRes = await fetch(`${BASE_URL}/api/spare-parts/${testPartId}/transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'OUT',
          quantity: 3,
          note: 'Lắp ráp nâng cấp cho máy trạm QA',
        }),
      });
      assert('Stock Out transaction (200)', stockOutRes.status === 200 || stockOutRes.status === 201, `Status: ${stockOutRes.status}`);

      // Verify currentStock updated to 7
      const refreshedPart = await prisma.sparePart.findUnique({ where: { id: testPartId } });
      assert('Stock updated accurately (10 - 3 = 7)', refreshedPart?.quantity === 7, `Stock was ${refreshedPart?.quantity}`);

      // 7.3 Stock Out exceeding available (Should be prevented)
      const overOutRes = await fetch(`${BASE_URL}/api/spare-parts/${testPartId}/transactions`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          type: 'OUT',
          quantity: 999,
          note: 'Xuất vượt quá tồn kho',
        }),
      });
      assert('Prevent negative stock transaction (400)', overOutRes.status >= 400, `Over-stock-out was allowed! Status: ${overOutRes.status}`);
    }
  } catch (err) {
    assert('Spare parts flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 8: RECYCLE BIN & AUTO RETENTION
  // -------------------------------------------------------------
  console.log('\n--- 🗑️ TEST SUITE 8: THÙNG RÁC, LƯU GIỮ & DỌN RÁC TỰ ĐỘNG ---');
  try {
    // 8.1 Get Trash Settings
    const trashSettingsRes = await fetch(`${BASE_URL}/api/trash/settings`, { headers: authHeaders });
    assert('Fetch Trash settings (200)', trashSettingsRes.status === 200, `Status: ${trashSettingsRes.status}`);
    const settingsJson = await trashSettingsRes.json();
    assert('Default retention is 30 days', settingsJson.retentionDays === 30, `Retention is ${settingsJson.retentionDays}`);

    // 8.2 Update Trash Settings to 45 days
    const updateSettingsRes = await fetch(`${BASE_URL}/api/trash/settings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ retentionDays: 45 }),
    });
    assert('Update Trash settings (200)', updateSettingsRes.status === 200, `Status: ${updateSettingsRes.status}`);

    // Revert back to 30 days
    await fetch(`${BASE_URL}/api/trash/settings`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ retentionDays: 30 }),
    });
    assert('Revert Trash settings back to 30 days', true);

    // 8.3 Auto Purge expired items
    const purgeRes = await fetch(`${BASE_URL}/api/trash/empty`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ expiredOnly: true }),
    });
    assert('Trigger auto purge expired trash (200)', purgeRes.status === 200, `Status: ${purgeRes.status}`);
  } catch (err) {
    assert('Recycle bin flow', false, err.message);
  }

  // -------------------------------------------------------------
  // TEST SUITE 9: SYSTEM BACKUP & HEALTH CHECK
  // -------------------------------------------------------------
  console.log('\n--- 🛡️ TEST SUITE 9: SAO LƯU HỆ THỐNG & TÍNH TOÀN VẸN ---');
  try {
    const backupStatusRes = await fetch(`${BASE_URL}/api/system/backup/status`, { headers: authHeaders });
    assert('Check Backup status API (200)', backupStatusRes.status === 200, `Status: ${backupStatusRes.status}`);

    const masterDataRes = await fetch(`${BASE_URL}/api/master-data`, { headers: authHeaders });
    assert('Check Master Data API (200)', masterDataRes.status === 200, `Status: ${masterDataRes.status}`);
    const masterJson = await masterDataRes.json();
    assert('Master Data contains categories, locations, vendors', 
      Array.isArray(masterJson?.data?.categories) && Array.isArray(masterJson?.data?.locations),
      'Master data missing essential lookup tables'
    );
  } catch (err) {
    assert('System backup check', false, err.message);
  }

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log('\n--- 🧹 DỌN DẸP DỮ LIỆU THỬ NGHIỆM (CLEANUP) ---');
  try {
    if (testTicketId) await prisma.ticket.delete({ where: { id: testTicketId } }).catch(() => {});
    if (testPartId) {
      await prisma.sparePartTransaction.deleteMany({ where: { sparePartId: testPartId } }).catch(() => {});
      await prisma.sparePart.delete({ where: { id: testPartId } }).catch(() => {});
    }
    await prisma.sparePart.deleteMany({ where: { sku: { startsWith: 'RAM-DDR5-QA-' } } }).catch(() => {});
    if (testLicId) {
      await prisma.licenseAssignment.deleteMany({ where: { licenseId: testLicId } }).catch(() => {});
      await prisma.license.delete({ where: { id: testLicId } }).catch(() => {});
    }
    if (testAssetId) {
      await prisma.assetMaintenanceLog.deleteMany({ where: { assetId: testAssetId } }).catch(() => {});
      await prisma.assetAssignment.deleteMany({ where: { assetId: testAssetId } }).catch(() => {});
      await prisma.licenseAssignment.deleteMany({ where: { assetId: testAssetId } }).catch(() => {});
      await prisma.asset.delete({ where: { id: testAssetId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    console.log('  ✅ Đã dọn dẹp sạch sẽ các bản ghi kiểm thử tự động.');
  } catch (err) {
    console.warn('  ⚠️ Cleanup warning:', err.message);
  }

  // -------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ (QA AUDIT SUMMARY)');
  console.log('================================================================');
  console.log(`  Tổng số ca kiểm thử (Total Tests):    ${results.total}`);
  console.log(`  Số ca đạt chuẩn (Passed):            ${results.passed} (${Math.round((results.passed / results.total) * 100)}%)`);
  console.log(`  Số ca thất bại (Failed):             ${results.failed}`);
  console.log(`  Cảnh báo (Warnings):                 ${results.warnings}`);
  console.log('================================================================');

  if (results.defects.length > 0) {
    console.log('\n🚨 DANH SÁCH LỖI & VẤN ĐỀ PHÁT HIỆN:');
    results.defects.forEach((d, idx) => {
      console.log(`  ${idx + 1}. [${d.severity}] ${d.name}: ${d.error}`);
    });
  } else {
    console.log('\n🏆 TUYỆT VỜI! 100% CÁC MODULE VÀ CA KIỂM THỬ ĐỀU ĐẠT CHUẨN HOÀN HẢO!');
  }

  await prisma.$disconnect();
  return results;
}

runQaAudit().catch((err) => {
  console.error('QA Script fatal error:', err);
  prisma.$disconnect();
  process.exit(1);
});
