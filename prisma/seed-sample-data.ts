import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Seeding rich sample data...');

  const staffRole = await prisma.role.findFirst({ where: { name: 'Staff' } });
  const managerRole = await prisma.role.findFirst({ where: { name: 'Asset Manager' } });
  const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });

  const passwordHash = await bcrypt.hash('User@123', 10);

  // 1. Create Employees
  const employeesData = [
    { fullName: 'Nguyễn Văn An', email: 'an.nguyen@company.com', department: 'IT / Kỹ thuật', phone: '0912345671', roleId: managerRole?.id || staffRole!.id },
    { fullName: 'Trần Thị Mai', email: 'mai.tran@company.com', department: 'Kế toán & Tài chính', phone: '0912345672', roleId: staffRole!.id },
    { fullName: 'Lê Hoàng Nam', email: 'nam.le@company.com', department: 'Thiết kế / Design', phone: '0912345673', roleId: staffRole!.id },
    { fullName: 'Phạm Đức Thắng', email: 'thang.pham@company.com', department: 'Kinh doanh & Sales', phone: '0912345674', roleId: staffRole!.id },
    { fullName: 'Hoàng Thùy Linh', email: 'linh.hoang@company.com', department: 'Marketing', phone: '0912345675', roleId: staffRole!.id },
    { fullName: 'Vũ Minh Tuấn', email: 'tuan.vu@company.com', department: 'IT / Kỹ thuật', phone: '0912345676', roleId: staffRole!.id },
    { fullName: 'Đặng Quốc Bảo', email: 'bao.dang@company.com', department: 'Ban Giám Đốc', phone: '0912345677', roleId: adminRole?.id || staffRole!.id },
  ];

  const users: any[] = [];
  for (const emp of employeesData) {
    const u = await prisma.user.upsert({
      where: { email: emp.email },
      update: {},
      create: { ...emp, passwordHash, isActive: true },
    });
    users.push(u);
  }
  console.log(`✅ Seeded ${users.length} employees`);

  // 2. Vendors & Locations
  const vendorPhongVu = await prisma.vendor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Phong Vũ Technology',
      contactPerson: 'Anh Tuấn',
      email: 'sales@phongvu.vn',
      phone: '18006867',
      address: '264 Nguyễn Thị Minh Khai, Q3, TP.HCM',
    },
  });

  const vendorFPT = await prisma.vendor.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'FPT Smart Cloud & Software',
      contactPerson: 'Chị Hằng',
      email: 'cloud@fpt.com',
      phone: '19006600',
      address: 'Tòa nhà FPT Cầu Giấy, Hà Nội',
    },
  });

  const catLaptop = await prisma.assetCategory.findFirst({ where: { name: 'Laptop' } });
  const catMonitor = await prisma.assetCategory.findFirst({ where: { name: 'Màn hình' } });
  const catNetwork = await prisma.assetCategory.findFirst({ where: { name: 'Thiết bị mạng' } });
  const catPrinter = await prisma.assetCategory.findFirst({ where: { name: 'Máy in' } });

  const locIT = await prisma.location.findFirst({ where: { name: 'Phòng IT' } });
  const locAcc = await prisma.location.findFirst({ where: { name: 'Phòng Kế toán' } });
  const locSales = await prisma.location.findFirst({ where: { name: 'Phòng Kinh doanh' } });

  // 3. Create Sample Assets
  const sampleAssets = [
    {
      assetTag: 'IT-LAP-001',
      name: 'MacBook Pro 16" M3 Max',
      categoryId: catLaptop!.id,
      brand: 'Apple',
      model: 'MBP 16 M3 Max 36GB 1TB',
      serialNumber: 'C02G9988H1',
      status: 'IN_USE' as const,
      condition: 'NEW' as const,
      purchasePrice: 68500000,
      purchaseDate: new Date('2024-02-15'),
      warrantyExpiry: new Date('2026-02-15'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
      assignedToUserIndex: 2, // Lê Hoàng Nam - Design
    },
    {
      assetTag: 'IT-LAP-002',
      name: 'Dell Latitude 5540 Core i7',
      categoryId: catLaptop!.id,
      brand: 'Dell',
      model: 'Latitude 5540 i7-1365U 16GB 512GB',
      serialNumber: 'SN-DELL-5540-01',
      status: 'IN_USE' as const,
      condition: 'NEW' as const,
      purchasePrice: 26500000,
      purchaseDate: new Date('2024-03-01'),
      warrantyExpiry: new Date('2027-03-01'),
      vendorId: vendorPhongVu.id,
      locationId: locAcc?.id,
      assignedToUserIndex: 1, // Trần Thị Mai - Kế toán
    },
    {
      assetTag: 'IT-LAP-003',
      name: 'ThinkPad X1 Carbon Gen 11',
      categoryId: catLaptop!.id,
      brand: 'Lenovo',
      model: 'X1 Carbon i7-1370P 32GB 1TB',
      serialNumber: 'SN-LENOVO-X1-88',
      status: 'IN_USE' as const,
      condition: 'NEW' as const,
      purchasePrice: 42000000,
      purchaseDate: new Date('2024-01-10'),
      warrantyExpiry: new Date('2027-01-10'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
      assignedToUserIndex: 6, // Đặng Quốc Bảo - Giám Đốc
    },
    {
      assetTag: 'IT-LAP-004',
      name: 'Asus ExpertBook B9400',
      categoryId: catLaptop!.id,
      brand: 'Asus',
      model: 'B9400 i7 16GB 1TB',
      serialNumber: 'SN-ASUS-B9-331',
      status: 'IN_USE' as const,
      condition: 'GOOD' as const,
      purchasePrice: 28900000,
      purchaseDate: new Date('2023-11-20'),
      warrantyExpiry: new Date('2025-11-20'),
      vendorId: vendorPhongVu.id,
      locationId: locSales?.id,
      assignedToUserIndex: 3, // Phạm Đức Thắng - Sales
    },
    {
      assetTag: 'IT-LAP-005',
      name: 'Dell Latitude 3440 Core i5',
      categoryId: catLaptop!.id,
      brand: 'Dell',
      model: 'Latitude 3440 i5-1335U 16GB 512GB',
      serialNumber: 'SN-DELL-3440-99',
      status: 'AVAILABLE' as const,
      condition: 'NEW' as const,
      purchasePrice: 17500000,
      purchaseDate: new Date('2024-04-10'),
      warrantyExpiry: new Date('2027-04-10'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
    },
    {
      assetTag: 'IT-LAP-006',
      name: 'HP EliteBook 840 G10',
      categoryId: catLaptop!.id,
      brand: 'HP',
      model: 'EliteBook 840 G10 i7 16GB',
      serialNumber: 'SN-HP-840-77',
      status: 'MAINTENANCE' as const,
      condition: 'FAIR' as const,
      purchasePrice: 27800000,
      purchaseDate: new Date('2023-08-15'),
      warrantyExpiry: new Date('2026-08-15'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
    },
    {
      assetTag: 'IT-MON-001',
      name: 'Màn hình Dell UltraSharp 27" 4K',
      categoryId: catMonitor!.id,
      brand: 'Dell',
      model: 'U2723QE 4K IPS Type-C',
      serialNumber: 'SN-DELL-U2723-01',
      status: 'IN_USE' as const,
      condition: 'NEW' as const,
      purchasePrice: 11900000,
      purchaseDate: new Date('2024-02-15'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
      assignedToUserIndex: 2, // Lê Hoàng Nam - Design
    },
    {
      assetTag: 'IT-MON-002',
      name: 'Màn hình LG 29" Ultrawide WFHD',
      categoryId: catMonitor!.id,
      brand: 'LG',
      model: '29WN600 75Hz IPS',
      serialNumber: 'SN-LG-29WN-88',
      status: 'AVAILABLE' as const,
      condition: 'NEW' as const,
      purchasePrice: 5200000,
      purchaseDate: new Date('2024-03-20'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
    },
    {
      assetTag: 'IT-NET-001',
      name: 'Router Cisco Catalyst 9200L',
      categoryId: catNetwork ? catNetwork.id : catLaptop!.id,
      brand: 'Cisco',
      model: 'C9200L-24P-4G-E',
      serialNumber: 'SN-CISCO-C92-01',
      status: 'IN_USE' as const,
      condition: 'GOOD' as const,
      purchasePrice: 48000000,
      purchaseDate: new Date('2023-06-01'),
      vendorId: vendorPhongVu.id,
      locationId: locIT?.id,
    },
    {
      assetTag: 'IT-PRI-001',
      name: 'Máy in Laser Canon LBP 2900',
      categoryId: catPrinter ? catPrinter.id : catLaptop!.id,
      brand: 'Canon',
      model: 'LBP 2900 Laser Printer',
      serialNumber: 'SN-CANON-2900-11',
      status: 'IN_USE' as const,
      condition: 'GOOD' as const,
      purchasePrice: 3850000,
      purchaseDate: new Date('2023-05-10'),
      vendorId: vendorPhongVu.id,
      locationId: locAcc?.id,
    },
  ];

  const admin = users[0];

  for (const item of sampleAssets) {
    const { assignedToUserIndex, ...assetData } = item;
    const asset = await prisma.asset.upsert({
      where: { assetTag: assetData.assetTag },
      update: { status: assetData.status },
      create: assetData,
    });

    if (assignedToUserIndex !== undefined && users[assignedToUserIndex]) {
      const targetUser = users[assignedToUserIndex];
      await prisma.assetAssignment.create({
        data: {
          assetId: asset.id,
          userId: targetUser.id,
          assignedById: admin.id,
          assignedAt: new Date('2024-03-01'),
          notes: 'Bàn giao thiết bị làm việc',
        },
      });
    }
  }
  console.log(`✅ Seeded ${sampleAssets.length} assets with assignments`);

  // 4. Sample Licenses
  const sampleLicenses = [
    {
      name: 'Microsoft 365 Business Standard',
      licenseKey: 'MS365-CORP-2024-STD-50SEATS',
      licenseType: 'SUBSCRIPTION' as const,
      totalSeats: 30,
      usedSeats: 4,
      purchaseDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      purchasePrice: 78000000,
      vendorId: vendorFPT.id,
      status: 'ACTIVE' as const,
    },
    {
      name: 'Adobe Creative Cloud All Apps (Team)',
      licenseKey: 'ADOBE-CC-TEAM-DESIGN-5SEAT',
      licenseType: 'SUBSCRIPTION' as const,
      totalSeats: 5,
      usedSeats: 2,
      purchaseDate: new Date('2024-03-01'),
      expiryDate: new Date('2025-03-01'),
      purchasePrice: 39500000,
      vendorId: vendorFPT.id,
      status: 'ACTIVE' as const,
    },
    {
      name: 'JetBrains All Products Pack',
      licenseKey: 'JB-CORP-ALL-DEV-10SEATS',
      licenseType: 'SUBSCRIPTION' as const,
      totalSeats: 10,
      usedSeats: 2,
      purchaseDate: new Date('2024-04-01'),
      expiryDate: new Date('2024-09-20'), // Expiring soon (< 40 days)
      purchasePrice: 48000000,
      vendorId: vendorFPT.id,
      status: 'ACTIVE' as const,
    },
    {
      name: 'Zoom Workplace Pro (Large Meetings)',
      licenseKey: 'ZOOM-PRO-ENT-2024',
      licenseType: 'SUBSCRIPTION' as const,
      totalSeats: 5,
      usedSeats: 1,
      purchaseDate: new Date('2024-02-01'),
      expiryDate: new Date('2025-02-01'),
      purchasePrice: 12500000,
      vendorId: vendorFPT.id,
      status: 'ACTIVE' as const,
    },
  ];

  for (const licData of sampleLicenses) {
    const lic = await prisma.license.create({ data: licData });

    // Assign seats to users
    if (lic.name.includes('Adobe')) {
      await prisma.licenseAssignment.create({
        data: { licenseId: lic.id, userId: users[2].id, assignedById: admin.id, notes: 'Cấp quyền Adobe cho Designer' },
      });
      await prisma.licenseAssignment.create({
        data: { licenseId: lic.id, userId: users[4].id, assignedById: admin.id, notes: 'Cấp quyền Adobe cho Marketing' },
      });
    } else if (lic.name.includes('Microsoft')) {
      for (let i = 0; i < 4; i++) {
        await prisma.licenseAssignment.create({
          data: { licenseId: lic.id, userId: users[i].id, assignedById: admin.id, notes: 'Office 365 bản quyền năm' },
        });
      }
    } else if (lic.name.includes('JetBrains')) {
      await prisma.licenseAssignment.create({
        data: { licenseId: lic.id, userId: users[0].id, assignedById: admin.id, notes: 'IDE cho IT Lead' },
      });
      await prisma.licenseAssignment.create({
        data: { licenseId: lic.id, userId: users[5].id, assignedById: admin.id, notes: 'IDE cho Developer' },
      });
    }
  }
  console.log(`✅ Seeded ${sampleLicenses.length} licenses with allocated seats`);

  // 5. Sample Maintenance Logs
  const hpLaptop = await prisma.asset.findUnique({ where: { assetTag: 'IT-LAP-006' } });
  const macLaptop = await prisma.asset.findUnique({ where: { assetTag: 'IT-LAP-001' } });
  const dellLaptop = await prisma.asset.findUnique({ where: { assetTag: 'IT-LAP-002' } });

  if (hpLaptop) {
    await prisma.assetMaintenanceLog.create({
      data: {
        assetId: hpLaptop.id,
        type: 'REPAIR',
        title: 'Thay quạt tản nhiệt & vệ sinh tra keo MX-4',
        description: 'Máy bị kêu to và nóng khi chạy tác vụ nặng, đã thay cụm tản nhiệt mới',
        cost: 650000,
        performedAt: new Date('2024-04-12'),
        performedById: users[0].id, // Nguyễn Văn An
        notes: 'Thay linh kiện chính hãng tại phòng IT',
      },
    });
  }

  if (macLaptop) {
    await prisma.assetMaintenanceLog.create({
      data: {
        assetId: macLaptop.id,
        type: 'INSPECTION',
        title: 'Kiểm tra pin & cài đặt môi trường đồ họa',
        description: 'Độ chai pin 0%, đã cài bộ font và Adobe Color profiles',
        cost: 0,
        performedAt: new Date('2024-02-16'),
        performedById: users[0].id,
      },
    });
  }

  if (dellLaptop) {
    await prisma.assetMaintenanceLog.create({
      data: {
        assetId: dellLaptop.id,
        type: 'UPGRADE',
        title: 'Nâng cấp thêm thanh RAM 16GB DDR5 Crucial (Tổng 32GB)',
        description: 'Nâng cấp để phục vụ xử lý bảng tính kế toán lớn và phần mềm MISA',
        cost: 1350000,
        performedAt: new Date('2024-03-05'),
        performedById: users[5].id, // Vũ Minh Tuấn - IT
        vendorId: vendorPhongVu.id,
        notes: 'Mua RAM tại Phong Vũ có hóa đơn VAT',
      },
    });
  }

  console.log('✅ Seeded detailed maintenance logs with assigned technicians');
  console.log('\n🎉 ALL SAMPLE DATA POPULATED SUCCESSFULLY!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
