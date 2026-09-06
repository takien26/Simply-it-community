import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const [sampleAssets, sampleLicenses, sampleServices, sampleTickets, samplePasswords] = await Promise.all([
      prisma.asset.count({ where: { name: { startsWith: '[MẪU]' } } }),
      prisma.license.count({ where: { name: { startsWith: '[MẪU]' } } }),
      prisma.iTService.count({ where: { name: { startsWith: '[MẪU]' } } }),
      prisma.ticket.count({ where: { title: { startsWith: '[MẪU]' } } }),
      prisma.passwordEntry.count({
        where: {
          OR: [
            { groupName: { startsWith: '📁 Dữ Liệu Mẫu' } },
            { title: { startsWith: '[MẪU]' } },
          ],
        },
      }),
    ]);

    const totalSampleItems = sampleAssets + sampleLicenses + sampleServices + sampleTickets + samplePasswords;

    return NextResponse.json({
      success: true,
      hasSampleData: totalSampleItems > 0,
      stats: {
        sampleAssets,
        sampleLicenses,
        sampleServices,
        sampleTickets,
        samplePasswords,
        totalSampleItems,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ==========================================
    // ACTION 1: SEED RICH REALISTIC SAMPLE DATA
    // ==========================================
    if (action === 'SEED') {
      // 1. Ensure basic Vendors exist
      let vendor = await prisma.vendor.findFirst({ where: { name: { contains: 'Phong Vũ' } } });
      if (!vendor) {
        vendor = await prisma.vendor.create({
          data: {
            name: 'Phong Vũ Technology (Mẫu)',
            contactPerson: 'Anh Tuấn - Phụ trách khối DN',
            email: 'enterprise@phongvu.vn',
            phone: '18006867',
            address: '264 Nguyễn Thị Minh Khai, Q3, TP.HCM',
          },
        });
      }

      let vendorCloud = await prisma.vendor.findFirst({ where: { name: { contains: 'FPT' } } });
      if (!vendorCloud) {
        vendorCloud = await prisma.vendor.create({
          data: {
            name: 'FPT Smart Cloud (Mẫu)',
            contactPerson: 'Chị Mai Hằng',
            email: 'cloud@fpt.com',
            phone: '19006600',
            address: 'Tòa nhà FPT Cầu Giấy, Hà Nội',
          },
        });
      }

      // 2. Ensure basic Location exists
      let location = await prisma.location.findFirst({ where: { name: { contains: 'Trụ sở chính' } } });
      if (!location) {
        location = await prisma.location.create({
          data: {
            name: 'Trụ sở chính - Tầng 8 (Mẫu)',
            building: 'Tòa nhà TechCorp 123 Phố Công Nghệ, Q. Hai Bà Trưng',
            floor: 'Tầng 8',
            notes: 'Khu vực làm việc Ban Công Nghệ Thông Tin',
          },
        });
      }

      // 3. Ensure Asset Categories exist
      const categoryNames = [
        { name: 'Laptop / Máy tính xách tay', icon: 'Laptop' },
        { name: 'Máy chủ / Server & Storage', icon: 'Server' },
        { name: 'Thiết bị Mạng / Router & Switch', icon: 'Network' },
        { name: 'Bản quyền Phần mềm (SaaS / On-prem)', icon: 'Key' },
        { name: 'Dịch vụ Mạng & Tên miền Cloud', icon: 'Globe' },
      ];

      const categories: Record<string, string> = {};
      for (const cat of categoryNames) {
        let existing = await prisma.assetCategory.findFirst({ where: { name: cat.name } });
        if (!existing) {
          existing = await prisma.assetCategory.create({
            data: { name: cat.name, icon: cat.icon, description: `Danh mục thiết bị ${cat.name}` },
          });
        }
        categories[cat.name] = existing.id;
      }

      // 4. Create Sample Assets
      const sampleAssets = [
        {
          assetTag: 'SAMPLE-LAP-001',
          name: '[MẪU] Laptop Dell XPS 15 9530 (Core i7, 32GB RAM, 1TB SSD)',
          categoryId: categories['Laptop / Máy tính xách tay'],
          vendorId: vendor.id,
          locationId: location.id,
          serialNumber: 'DL-XPS15-SAMPLE-998',
          model: 'Dell XPS 15 9530',
          brand: 'Dell',
          purchasePrice: 45000000,
          purchaseDate: new Date('2024-01-15'),
          warrantyExpiry: new Date('2027-01-15'),
          status: 'IN_USE' as const,
        },
        {
          assetTag: 'SAMPLE-LAP-002',
          name: '[MẪU] MacBook Pro 16" M3 Pro (18GB RAM, 512GB SSD)',
          categoryId: categories['Laptop / Máy tính xách tay'],
          vendorId: vendor.id,
          locationId: location.id,
          serialNumber: 'MBP16-M3-SAMPLE-552',
          model: 'Apple MacBook Pro 16 M3 Pro',
          brand: 'Apple',
          purchasePrice: 56900000,
          purchaseDate: new Date('2024-03-10'),
          warrantyExpiry: new Date('2026-03-10'),
          status: 'IN_USE' as const,
        },
        {
          assetTag: 'SAMPLE-SRV-001',
          name: '[MẪU] Máy chủ Dell PowerEdge R760 Rack 2U (2x Xeon Gold 6430, 128GB RAM)',
          categoryId: categories['Máy chủ / Server & Storage'],
          vendorId: vendor.id,
          locationId: location.id,
          serialNumber: 'PE-R760-SAMPLE-001',
          model: 'PowerEdge R760',
          brand: 'Dell',
          purchasePrice: 185000000,
          purchaseDate: new Date('2023-11-20'),
          warrantyExpiry: new Date('2028-11-20'),
          status: 'IN_USE' as const,
        },
        {
          assetTag: 'SAMPLE-NET-001',
          name: '[MẪU] Switch Core Cisco Catalyst C9300-48P PoE+ Gigabit',
          categoryId: categories['Thiết bị Mạng / Router & Switch'],
          vendorId: vendor.id,
          locationId: location.id,
          serialNumber: 'CSCO-C9300-SAMPLE-77',
          model: 'Cisco Catalyst 9300',
          brand: 'Cisco',
          purchasePrice: 78000000,
          purchaseDate: new Date('2023-08-10'),
          warrantyExpiry: new Date('2026-08-10'),
          status: 'IN_USE' as const,
        },
      ];

      for (const a of sampleAssets) {
        await prisma.asset.upsert({
          where: { assetTag: a.assetTag },
          update: a,
          create: a,
        });
      }

      // 5. Create Sample Licenses
      const sampleLicenses = [
        {
          name: '[MẪU] Microsoft 365 Business Standard (Gói 50 User)',
          licenseKey: 'MS365-STD-50U-SAMPLE-XXXXX-XXXXX',
          licenseType: 'SUBSCRIPTION' as const,
          vendorId: vendorCloud.id,
          totalSeats: 50,
          purchasePrice: 85000000,
          purchaseDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
        },
        {
          name: '[MẪU] Adobe Creative Cloud All Apps (Gói 5 License Team)',
          licenseKey: 'ADOBE-CC-5U-SAMPLE-YYYYY-YYYYY',
          licenseType: 'SUBSCRIPTION' as const,
          vendorId: vendorCloud.id,
          totalSeats: 5,
          purchasePrice: 48000000,
          purchaseDate: new Date('2024-04-15'),
          expiryDate: new Date('2025-04-15'),
        },
      ];

      for (const lic of sampleLicenses) {
        const existing = await prisma.license.findFirst({ where: { name: lic.name } });
        if (!existing) {
          await prisma.license.create({ data: lic });
        }
      }

      // 6. Create Sample IT Services & Domains
      const sampleServices = [
        {
          serviceCode: 'SRV-SAMPLE-001',
          name: '[MẪU] Tên miền chính doanh nghiệp (company.vn & portal.company.vn)',
          serviceType: 'DOMAIN_SSL' as const,
          billingCycle: 'ANNUAL' as const,
          vendorId: vendorCloud.id,
          cost: 850000,
          startDate: new Date('2023-05-01'),
          renewalDate: new Date('2025-05-01'),
          status: 'ACTIVE' as const,
        },
        {
          serviceCode: 'SRV-SAMPLE-002',
          name: '[MẪU] Đường truyền Internet Leased Line cáp quang 100Mbps Quốc tế',
          serviceType: 'INTERNET' as const,
          billingCycle: 'MONTHLY' as const,
          vendorId: vendorCloud.id,
          cost: 12500000,
          startDate: new Date('2023-01-01'),
          renewalDate: new Date('2025-01-01'),
          status: 'ACTIVE' as const,
        },
        {
          serviceCode: 'SRV-SAMPLE-003',
          name: '[MẪU] Thuê chỗ đặt máy chủ Colocation Data Center Tier 3 Viettel IDC',
          serviceType: 'CLOUD_HOSTING' as const,
          billingCycle: 'MONTHLY' as const,
          vendorId: vendorCloud.id,
          cost: 22000000,
          startDate: new Date('2023-06-01'),
          renewalDate: new Date('2025-06-01'),
          status: 'ACTIVE' as const,
        },
      ];

      for (const s of sampleServices) {
        const existing = await prisma.iTService.findUnique({ where: { serviceCode: s.serviceCode } });
        if (!existing) {
          await prisma.iTService.create({ data: s });
        }
      }

      // 7. Create Sample Tickets
      const sampleTickets = [
        {
          ticketNumber: 'TK-SAMPLE-001',
          title: '[MẪU] Cấp phát máy tính và tài khoản cho nhân sự mới phòng Kế toán',
          description: 'Chuẩn bị laptop Dell XPS, bàn giao chuột, cài đặt phần mềm kế toán MISA và bộ Office 365.',
          priority: 'HIGH' as const,
          status: 'RESOLVED' as const,
          category: 'HARDWARE' as const,
          createdById: user.userId,
          assignedToId: user.userId,
        },
        {
          ticketNumber: 'TK-SAMPLE-002',
          title: '[MẪU] Hướng dẫn cấu hình kết nối VPN từ xa và xác thực 2 lớp (2FA)',
          description: 'Hỗ trợ nhân viên làm việc từ xa kết nối an toàn vào mạng văn phòng thông qua cổng Fortinet VPN.',
          priority: 'MEDIUM' as const,
          status: 'IN_PROGRESS' as const,
          category: 'NETWORK' as const,
          createdById: user.userId,
          assignedToId: user.userId,
        },
      ];

      for (const tk of sampleTickets) {
        const existing = await prisma.ticket.findUnique({ where: { ticketNumber: tk.ticketNumber } });
        if (!existing) {
          await prisma.ticket.create({ data: tk });
        }
      }

      // 8. Create Sample KeePass Passwords & Folders
      const samplePasswords = [
        {
          title: '[MẪU] Core Switch Cisco C9300 (SSH Console)',
          username: 'admin_cisco',
          password: 'Cisco@SecurePass#2026!',
          url: '192.168.1.1:22',
          groupName: '📁 Dữ Liệu Mẫu / 🌐 Hạ Tầng Mạng / Switch Core Cisco',
          notes: 'MẪU DỮ LIỆU - Tài khoản quản trị switch lõi qua SSH / Telnet cổng Console',
        },
        {
          title: '[MẪU] Firewall Fortigate 100F (HTTPS Web GUI)',
          username: 'forti_admin',
          password: 'FortiGate@9988_Shield!',
          url: 'https://192.168.1.254:8443',
          groupName: '📁 Dữ Liệu Mẫu / 🌐 Hạ Tầng Mạng / Firewall Fortigate',
          notes: 'MẪU DỮ LIỆU - Giao diện Web GUI quản trị tường lửa mạng Internet & VPN',
        },
        {
          title: '[MẪU] VMware ESXi 8.0 Hypervisor Host 01',
          username: 'root',
          password: 'VMware@Host01_2026#Ex',
          url: 'https://172.16.0.10',
          groupName: '📁 Dữ Liệu Mẫu / 🖥️ Máy Chủ (Server) / ESXi Host Cluster 01',
          notes: 'MẪU DỮ LIỆU - Cụm máy chủ ảo hóa chứa các máy ảo Portal, ERP và Database',
        },
        {
          title: '[MẪU] Cơ sở dữ liệu PostgreSQL Production Database',
          username: 'postgres_dba',
          password: 'PgSql_ProdDB@Secure#2026',
          url: '172.16.0.25:5432 / db_portal',
          groupName: '📁 Dữ Liệu Mẫu / 🖥️ Máy Chủ (Server) / Database PostgreSQL',
          notes: 'MẪU DỮ LIỆU - Database chính của hệ thống cổng thông tin nội bộ',
        },
        {
          title: '[MẪU] Microsoft 365 Global Administrator Portal',
          username: 'admin@company.onmicrosoft.com',
          password: 'M365_AdminGlobal#2026!',
          url: 'https://admin.microsoft.com',
          groupName: '📁 Dữ Liệu Mẫu / ☁️ Dịch Vụ Cloud / Microsoft 365 Admin',
          notes: 'MẪU DỮ LIỆU - Quản lý người dùng, bản quyền và chính sách bảo mật Microsoft Entra ID',
        },
        {
          title: '[MẪU] AWS Cloud Management Console (Root Account)',
          username: 'aws-root@company.com',
          password: 'AWS_CloudRoot#Pass2026!',
          url: 'https://aws.amazon.com/console',
          groupName: '📁 Dữ Liệu Mẫu / ☁️ Dịch Vụ Cloud / AWS Root Management',
          notes: 'MẪU DỮ LIỆU - Quản lý tài nguyên máy chủ EC2, S3 Bucket và RDS Database trên AWS',
        },
      ];

      for (const p of samplePasswords) {
        const existing = await prisma.passwordEntry.findFirst({ where: { title: p.title } });
        if (!existing) {
          await prisma.passwordEntry.create({ data: p });
        }
      }

      // 9. Update Custom Folders and Order for KeePass
      const sampleFolderPaths = [
        '📁 Dữ Liệu Mẫu',
        '📁 Dữ Liệu Mẫu / 🌐 Hạ Tầng Mạng',
        '📁 Dữ Liệu Mẫu / 🌐 Hạ Tầng Mạng / Switch Core Cisco',
        '📁 Dữ Liệu Mẫu / 🌐 Hạ Tầng Mạng / Firewall Fortigate',
        '📁 Dữ Liệu Mẫu / 🖥️ Máy Chủ (Server)',
        '📁 Dữ Liệu Mẫu / 🖥️ Máy Chủ (Server) / ESXi Host Cluster 01',
        '📁 Dữ Liệu Mẫu / 🖥️ Máy Chủ (Server) / Database PostgreSQL',
        '📁 Dữ Liệu Mẫu / ☁️ Dịch Vụ Cloud',
        '📁 Dữ Liệu Mẫu / ☁️ Dịch Vụ Cloud / Microsoft 365 Admin',
        '📁 Dữ Liệu Mẫu / ☁️ Dịch Vụ Cloud / AWS Root Management',
      ];

      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      let currentFolders: string[] = [];
      if (setting && setting.value) {
        try { currentFolders = JSON.parse(setting.value); } catch {}
      }

      const mergedFolders = Array.from(new Set([...currentFolders, ...sampleFolderPaths]));
      await prisma.systemSetting.upsert({
        where: { key: 'passwords.custom_folders' },
        update: { value: JSON.stringify(mergedFolders) },
        create: {
          key: 'passwords.custom_folders',
          value: JSON.stringify(mergedFolders),
          group: 'passwords',
          label: 'Cây thư mục mật khẩu tùy biến',
          type: 'JSON',
        },
      });

      return NextResponse.json({
        success: true,
        message: '✅ Đã tạo thành công bộ dữ liệu mẫu gồm 4 Tài sản, 2 Bản quyền, 3 Dịch vụ, 2 Ticket và 6 Tài khoản KeePass!',
      });
    }

    // ==========================================
    // ACTION 2: CLEAR ALL SAMPLE DEMO DATA SAFELY
    // ==========================================
    if (action === 'CLEAR') {
      const [delAssets, delLicenses, delServices, delTickets, delPasswords] = await Promise.all([
        prisma.asset.deleteMany({ where: { name: { startsWith: '[MẪU]' } } }),
        prisma.license.deleteMany({ where: { name: { startsWith: '[MẪU]' } } }),
        prisma.iTService.deleteMany({ where: { name: { startsWith: '[MẪU]' } } }),
        prisma.ticket.deleteMany({ where: { title: { startsWith: '[MẪU]' } } }),
        prisma.passwordEntry.deleteMany({
          where: {
            OR: [
              { groupName: { startsWith: '📁 Dữ Liệu Mẫu' } },
              { title: { startsWith: '[MẪU]' } },
            ],
          },
        }),
      ]);

      // Clean up sample folder from passwords settings
      const setting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.custom_folders' } });
      if (setting && setting.value) {
        try {
          let currentFolders: string[] = JSON.parse(setting.value);
          currentFolders = currentFolders.filter((f) => !f.startsWith('📁 Dữ Liệu Mẫu'));
          await prisma.systemSetting.update({
            where: { key: 'passwords.custom_folders' },
            data: { value: JSON.stringify(currentFolders) },
          });
        } catch {}
      }

      const orderSetting = await prisma.systemSetting.findUnique({ where: { key: 'passwords.folder_order' } });
      if (orderSetting && orderSetting.value) {
        try {
          let orderList: string[] = JSON.parse(orderSetting.value);
          orderList = orderList.filter((f) => !f.startsWith('📁 Dữ Liệu Mẫu'));
          await prisma.systemSetting.update({
            where: { key: 'passwords.folder_order' },
            data: { value: JSON.stringify(orderList) },
          });
        } catch {}
      }

      const totalDeleted =
        delAssets.count + delLicenses.count + delServices.count + delTickets.count + delPasswords.count;

      return NextResponse.json({
        success: true,
        message: `🗑️ Đã xóa sạch ${totalDeleted} bản ghi dữ liệu mẫu một cách an toàn mà không làm mất dữ liệu thật của bạn.`,
        deleted: {
          assets: delAssets.count,
          licenses: delLicenses.count,
          services: delServices.count,
          tickets: delTickets.count,
          passwords: delPasswords.count,
        },
      });
    }

    return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    console.error('Sample Data API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
