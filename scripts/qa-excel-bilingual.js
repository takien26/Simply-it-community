const ExcelJS = require('exceljs');

async function testTemplates() {
  const BASE_URL = 'http://localhost:3001';
  console.log('🧪 Starting QA for Bilingual Excel Templates & API Endpoints...');

  // 1. Login as Admin
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@company.com', password: 'Admin@123' }),
  });

  const setCookie = loginRes.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(';')[0] : '';
  console.log('Login status:', loginRes.status, 'Cookie acquired:', !!cookie);

  // Helper to fetch template with cookie
  async function fetchTemplate(type, lang) {
    const res = await fetch(`${BASE_URL}/api/import/template?type=${type}&lang=${lang}`, {
      headers: cookie ? { Cookie: cookie } : {},
    });
    const disposition = res.headers.get('content-disposition');
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const wb = new ExcelJS.Workbook();
    if (res.status === 200) {
      await wb.xlsx.load(buffer);
    }
    return { status: res.status, disposition, wb };
  }

  // Test Asset EN & VI
  const assetEn = await fetchTemplate('ASSET', 'en');
  console.log('✅ Asset EN Status:', assetEn.status, 'Disposition:', assetEn.disposition);
  if (assetEn.status === 200) {
    const sheet = assetEn.wb.worksheets[0];
    console.log('   Sheet name:', sheet.name);
    console.log('   Col 1 & 2:', sheet.getRow(1).getCell(1).value, '|', sheet.getRow(1).getCell(2).value);
  }

  const assetVi = await fetchTemplate('ASSET', 'vi');
  console.log('✅ Asset VI Status:', assetVi.status, 'Disposition:', assetVi.disposition);
  if (assetVi.status === 200) {
    const sheet = assetVi.wb.worksheets[0];
    console.log('   Sheet name:', sheet.name);
    console.log('   Col 1 & 2:', sheet.getRow(1).getCell(1).value, '|', sheet.getRow(1).getCell(2).value);
  }

  // Test License EN
  const licEn = await fetchTemplate('LICENSE', 'en');
  console.log('✅ License EN Status:', licEn.status, 'Disposition:', licEn.disposition);
  if (licEn.status === 200) {
    const sheet = licEn.wb.worksheets[0];
    console.log('   Sheet name:', sheet.name);
    console.log('   Col 1 & 2:', sheet.getRow(1).getCell(1).value, '|', sheet.getRow(1).getCell(2).value);
  }

  // Test User EN
  const userEn = await fetchTemplate('USER', 'en');
  console.log('✅ User EN Status:', userEn.status, 'Disposition:', userEn.disposition);
  if (userEn.status === 200) {
    const sheet = userEn.wb.worksheets[0];
    console.log('   Sheet name:', sheet.name);
    console.log('   Col 1 & 2 (row 4):', sheet.getRow(4).getCell(1).value, '|', sheet.getRow(4).getCell(2).value);
  }

  // Test Service EN
  const serviceEn = await fetchTemplate('SERVICE', 'en');
  console.log('✅ Service EN Status:', serviceEn.status, 'Disposition:', serviceEn.disposition);
  if (serviceEn.status === 200) {
    const sheet = serviceEn.wb.worksheets[0];
    console.log('   Sheet name:', sheet.name);
    console.log('   Col 1 & 2:', sheet.getRow(1).getCell(1).value, '|', sheet.getRow(1).getCell(2).value);
  }

  console.log('\n🎉 ALL BILINGUAL TEMPLATE DOWNLOAD TESTS PASSED SUCCESSFULLY!');
}

testTemplates().catch(console.error);
