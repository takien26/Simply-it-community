import { PrismaClient, DocumentType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Đang khởi tạo dữ liệu chuyên môn cho các Team IT...');

  // 1. Khởi tạo / Cập nhật các Support Teams chuẩn
  const teamsData = [
    {
      code: 'IT-NET',
      name: 'Team IT Network & Hạ Tầng Mạng',
      description: 'Chuyên trách hệ thống Switch, Router, Firewall, WiFi, Cáp quang Internet và Server phòng máy chủ.',
      companyScope: 'ALL',
      locationScope: 'Toàn hệ thống',
    },
    {
      code: 'IT-APP',
      name: 'Team IT Ứng Dụng & ERP/Phần Mềm',
      description: 'Chuyên trách hệ thống phần mềm ERP SAP, Phần mềm kế toán MISA, CRM, Database SQL Server và cổng thông tin nội bộ.',
      companyScope: 'ALL',
      locationScope: 'Toàn hệ thống',
    },
    {
      code: 'IT-HELPDESK',
      name: 'Team IT Helpdesk & Hỗ Trợ Thiết Bị',
      description: 'Chuyên trách cài đặt máy tính, máy in, bàn giao laptop nhân viên mới, thu hồi tài sản và xử lý sự cố tại chỗ (Onsite).',
      companyScope: 'ALL',
      locationScope: 'Toàn văn phòng',
    },
    {
      code: 'IT-SEC',
      name: 'Team An Toàn Thông Tin & Bảo Mật (InfoSec)',
      description: 'Chuyên trách chính sách an toàn thông tin, phòng chống mã độc Ransomware, quản lý chứng thư số và phân quyền bảo mật.',
      companyScope: 'ALL',
      locationScope: 'Toàn hệ thống',
    },
  ];

  for (const t of teamsData) {
    await prisma.supportTeam.upsert({
      where: { code: t.code },
      update: { name: t.name, description: t.description },
      create: t,
    });
  }
  console.log('✅ Đã tạo 4 Support Teams chuyên trách');

  // 2. Tạo Tài Liệu Quy Trình Chuyên Môn Của Từng Team (Documents)
  const itDocuments = [
    // --- NETWORK TEAM ---
    {
      title: '[IT-NET] Sơ đồ Quy hoạch Dải Mạng VLAN & IP Tĩnh Máy Chủ',
      type: DocumentType.OTHER,
      notes: `QUY HOẠCH VLAN TOÀN CÔNG TY:
- VLAN 10 (192.168.10.0/24): Hệ thống Máy chủ Server & Database (Gateway: 192.168.10.1)
- VLAN 20 (192.168.20.0/24): Khối Văn phòng & Máy trạm làm việc (DHCP Scope: .100 - .250)
- VLAN 30 (192.168.30.0/24): Mạng WiFi Khách & Thiết bị cá nhân (Cách ly mạng nội bộ)
- VLAN 40 (192.168.40.0/24): Hệ thống Camera an ninh & Máy chấm công
- DNS Nội bộ: 192.168.10.10, DNS Dự phòng: 8.8.8.8
- Quy trình mở Port Firewall Fortinet: Tạo Ticket đính kèm phê duyệt của Trưởng phòng IT trước khi NAT Port ra ngoài.`,
    },
    {
      title: '[IT-NET] Hướng dẫn Cấu hình Dự phòng Đường truyền Internet (Dual WAN Failover)',
      type: DocumentType.OTHER,
      notes: `HỆ THỐNG ĐƯỜNG TRUYỀN INTERNET CÔNG TY:
1. Đường chính (WAN 1): Cáp quang Viettel Leased Line 150Mbps - IP Tĩnh: 118.70.x.x (Dùng cho Server & VPN)
2. Đường phụ (WAN 2): Cáp quang VNPT Fiber 200Mbps - IP Tĩnh: 14.162.x.x (Dự phòng tự động nhảy khi WAN 1 đứt)
Hotline hỗ trợ kỹ thuật khẩn cấp Viettel IDC: 1800.8000 (Mã hợp đồng: VT-CORP-2025).`,
    },

    // --- APPLICATION & ERP TEAM ---
    {
      title: '[IT-APP] Hướng dẫn Kết nối Cơ sở dữ liệu SQL Server Phần Mềm MISA / Bravo',
      type: DocumentType.OTHER,
      notes: `CẤU HÌNH KẾT NỐI PHẦN MỀM KẾ TOÁN MISA / BRAVO:
- Máy chủ CSDL: 192.168.10.15,1433 (SQL Server 2022 Standard)
- Tên Database kế toán: MISA_SME_2026_TechCorp
- Chế độ xác thực: SQL Server Authentication (User: misa_user_app)
- Lịch sao lưu tự động (Backup): Tự động full backup lúc 23:00 hàng ngày và lưu trữ sang ổ NAS D:\\DB_Backups.
- Khi người dùng báo lỗi "Không thể kết nối máy chủ dữ liệu": Kiểm tra dịch vụ SQL Browser trên Server 192.168.10.15 và kiểm tra thông mạng Port 1433.`,
    },
    {
      title: '[IT-APP] Quy trình Cấp quyền Người dùng trên Hệ thống Quản trị ERP / SAP',
      type: DocumentType.OTHER,
      notes: `QUY TRÌNH PHÂN QUYỀN ERP SAP:
1. Nhân sự mới phải có Phiếu yêu cầu truy cập được duyệt bởi Giám đốc khối / Trưởng bộ phận.
2. Team IT-APP tạo tài khoản theo cú pháp: ten.ho (VD: nam.nguyen).
3. Gán Role theo ma trận phân quyền: Role Kế toán (FI/CO), Role Mua hàng (MM), Role Bán hàng (SD).
4. Khóa tài khoản ngay lập tức khi nhận được thông báo Offboarding từ phòng Nhân sự.`,
    },

    // --- HELPDESK & HARDWARE TEAM ---
    {
      title: '[IT-HELPDESK] Tiêu chuẩn Cấp phát Thiết bị Máy tính theo Vị trí Công việc',
      type: DocumentType.OTHER,
      notes: `TIÊU CHUẨN TRANG THIẾT BỊ LÀM VIỆC:
1. Khối Kỹ sư / Lập trình viên (Developer): Dell Precision / ThinkPad i7 Gen 13+, RAM 32GB, SSD 1TB NVMe, 02 Màn hình 27 inch 2K.
2. Khối Kế toán / Tài chính / Thiết kế: Laptop Dell Latitude / HP ProBook Core i5/i7, RAM 16GB, SSD 512GB, 01 Màn hình phụ 24 inch.
3. Khối Kinh doanh / Marketing / Hành chính: Laptop mỏng nhẹ di động (Dell Vostro / HP Pavilion / Lenovo ThinkBook) i5, RAM 16GB, SSD 512GB.
4. Thời hạn khấu hao máy tính: 03 năm đối với Laptop và 04 năm đối với PC để bàn.`,
    },
    {
      title: '[IT-HELPDESK] Checklist Thu hồi Tài sản khi Nhân viên Nghỉ việc (Offboarding)',
      type: DocumentType.OTHER,
      notes: `CHECKLIST THU HỒI TÀI SẢN KHI NGHỈ VIỆC:
1. Thu hồi Laptop, Sạc Adapter chính hãng, Chuột, Balo công ty.
2. Kiểm tra tình trạng vật lý (nứt vỡ, móp méo, màn hình điểm chết).
3. Bàn giao dữ liệu công việc cho Quản lý trực tiếp > Ký Biên bản bàn giao thu hồi tài sản trên SIMPLY IT.
4. Tiến hành Reset Windows sạch (Sysprep / Clean Install) và nhập kho tài sản Available để chuẩn bị cấp phát tiếp theo.`,
    },

    // --- SECURITY & INFOSEC TEAM ---
    {
      title: '[IT-SEC] Chính sách An toàn Thông tin & Đặt Mật khẩu Doanh nghiệp',
      type: DocumentType.OTHER,
      notes: `CHÍNH SÁCH BẢO MẬT & MẬT KHẨU:
1. Độ dài tối thiểu: 10 ký tự, bao gồm: Chữ hoa (A-Z), Chữ thường (a-z), Chữ số (0-9) và Ký tự đặc biệt (@, #, $, !).
2. Thời hạn hiệu lực: Mật khẩu tự động hết hạn sau 90 ngày. Không được đặt trùng 5 mật khẩu gần nhất.
3. Khóa tài khoản: Tự động khóa sau 5 lần nhập sai liên tiếp.
4. Bắt buộc kích hoạt xác thực 2 bước (MFA) cho toàn bộ tài khoản Email Microsoft 365 và VPN.`,
    },
    {
      title: '[IT-SEC] Kế hoạch Ứng phó Sự cố Khẩn cấp khi Nhiễm Mã Độc / Ransomware',
      type: DocumentType.OTHER,
      notes: `QUY TRÌNH XỬ LÝ KHẨN CẤP MÃ ĐỘC TỐNG TIỀN (RANSOMWARE):
1. Bước 1 (Cô lập ngay): Rút ngay dây mạng LAN và tắt WiFi trên máy tính bị nghi ngờ nhiễm virus. TUYỆT ĐỐI KHÔNG TẮT NGUỒN ĐỘT NGỘT.
2. Bước 2 (Báo động): Gọi ngay Hotline IT Khẩn cấp hoặc tạo Ticket mức độ URGENT P1.
3. Bước 3 (Kiểm tra lây lan): IT-SEC rà soát log Firewall để phát hiện các kết nối bất thường ra IP quốc tế.
4. Bước 4 (Khôi phục): Quét sạch virus và khôi phục dữ liệu từ bản sao lưu độc lập (Cold Backup) trước thời điểm tấn công.`,
    },
  ];

  for (const doc of itDocuments) {
    const existing = await prisma.document.findFirst({ where: { title: doc.title } });
    if (!existing) {
      await prisma.document.create({
        data: {
          title: doc.title,
          type: doc.type,
          notes: doc.notes,
          fileName: `${doc.title.slice(0, 30)}.pdf`,
          fileUrl: '/uploads/documents/it-guidelines.pdf',
        },
      });
    } else {
      await prisma.document.update({
        where: { id: existing.id },
        data: { notes: doc.notes, type: doc.type },
      });
    }
  }
  console.log('✅ Đã nạp 8 bộ tài liệu chuyên môn kỹ thuật cho các Team IT');

  console.log('🎉 Hoàn tất nạp dữ liệu chuyên sâu cho các Team IT!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
