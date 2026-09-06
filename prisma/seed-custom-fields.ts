import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚡ Updating categories with dynamic custom field presets...');

  // 1. Laptop
  const laptopFields = [
    { key: 'cpu', label: 'CPU / Vi xử lý', type: 'text', placeholder: 'VD: Intel Core i7-1365U / M3 Pro', required: true },
    { key: 'ram', label: 'Dung lượng RAM', type: 'text', placeholder: 'VD: 16GB DDR5 / 32GB Unified', required: true },
    { key: 'storage', label: 'Ổ cứng / SSD', type: 'text', placeholder: 'VD: 512GB NVMe / 1TB SSD', required: true },
    { key: 'screen', label: 'Kích thước màn hình', type: 'text', placeholder: 'VD: 14 inch 2.8K OLED / 15.6 inch FHD' },
    { key: 'os', label: 'Hệ điều hành', type: 'select', options: ['Windows 11 Pro', 'macOS Sequoia', 'Ubuntu Linux', 'Không kèm OS'] },
  ];

  // 2. Màn hình
  const monitorFields = [
    { key: 'size_inch', label: 'Kích thước (Inch)', type: 'text', placeholder: 'VD: 27 inch, 34 inch Ultrawide' },
    { key: 'resolution', label: 'Độ phân giải', type: 'select', options: ['4K UHD (3840x2160)', '2K QHD (2560x1440)', 'WFHD (2560x1080)', 'FHD 1080p (1920x1080)'] },
    { key: 'refresh_rate', label: 'Tần số quét', type: 'text', placeholder: 'VD: 60Hz, 75Hz, 144Hz' },
    { key: 'ports', label: 'Cổng kết nối', type: 'text', placeholder: 'VD: HDMI, DisplayPort, Type-C 90W PD' },
  ];

  // 3. Thiết bị mạng (Network)
  const networkFields = [
    { key: 'ip_address', label: 'Địa chỉ IP tĩnh', type: 'text', placeholder: 'VD: 192.168.1.1' },
    { key: 'mac_address', label: 'Địa chỉ MAC', type: 'text', placeholder: 'VD: 00:1A:2B:3C:4D:5E' },
    { key: 'port_count', label: 'Số cổng mạng (Ports)', type: 'number', placeholder: 'VD: 24, 48' },
    { key: 'speed', label: 'Tốc độ cổng', type: 'select', options: ['1 Gbps (Gigabit)', '2.5 Gbps', '10 Gbps (SFP+)', '100 Mbps'] },
    { key: 'firmware', label: 'Phiên bản Firmware', type: 'text', placeholder: 'VD: Cisco IOS 17.6.3' },
  ];

  // 4. Server / Hệ thống (System)
  const serverFields = [
    { key: 'hostname', label: 'Tên Hostname / Server', type: 'text', placeholder: 'VD: srv-db-prod01', required: true },
    { key: 'ip_mgmt', label: 'IP Quản trị iDRAC / iLO', type: 'text', placeholder: 'VD: 10.0.0.50' },
    { key: 'cpu_cores', label: 'Số Cores CPU', type: 'number', placeholder: 'VD: 32, 64' },
    { key: 'ram_gb', label: 'Dung lượng RAM (GB)', type: 'number', placeholder: 'VD: 128, 256' },
    { key: 'raid', label: 'Cấu hình RAID', type: 'select', options: ['RAID 0', 'RAID 1', 'RAID 5', 'RAID 6', 'RAID 10', 'No RAID'] },
    { key: 'environment', label: 'Môi trường vận hành', type: 'select', options: ['Production', 'Staging / UAT', 'Development', 'Backup / DR'] },
  ];

  await prisma.assetCategory.updateMany({
    where: { name: 'Laptop' },
    data: { customFields: laptopFields },
  });

  await prisma.assetCategory.updateMany({
    where: { name: 'Màn hình' },
    data: { customFields: monitorFields },
  });

  await prisma.assetCategory.updateMany({
    where: { name: 'Thiết bị mạng' },
    data: { customFields: networkFields },
  });

  // Ensure Server / System category exists
  const serverCat = await prisma.assetCategory.findFirst({ where: { name: 'Máy chủ & Hệ thống (Server)' } });
  if (!serverCat) {
    await prisma.assetCategory.create({
      data: {
        name: 'Máy chủ & Hệ thống (Server)',
        icon: '🖥️',
        description: 'Máy chủ vật lý, Virtual Machine, thiết bị lưu trữ NAS/SAN',
        customFields: serverFields,
      },
    });
  } else {
    await prisma.assetCategory.update({
      where: { id: serverCat.id },
      data: { customFields: serverFields },
    });
  }

  console.log('✅ Updated all category custom field schemas successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
