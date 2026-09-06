export interface KBArticle {
  id: string;
  title: string;
  category: string;
  categoryKey: 'ACCOUNT' | 'NETWORK' | 'EMAIL' | 'PRINTER' | 'HARDWARE' | 'SOFTWARE' | 'APPROVAL' | 'MEETING';
  keywords: string[];
  summary: string;
  steps: string;
  troubleshooting?: string;
  requiresTicketIfFailed?: boolean;
}

export const COMPREHENSIVE_IT_KB: KBArticle[] = [
  // ==================== 1. TÀI KHOẢN & MẬT KHẨU ====================
  {
    id: 'kb-pwd-change',
    title: 'Cách đổi mật khẩu máy tính Windows (Nhanh nhất)',
    category: 'Tài khoản & Mật khẩu',
    categoryKey: 'ACCOUNT',
    keywords: ['đổi mật khẩu', 'đổi pass', 'change password', 'đổi mật khẩu máy tính', 'đổi pass máy tính', 'mật khẩu windows', 'mật khẩu pc'],
    summary: 'Hướng dẫn đổi mật khẩu đăng nhập máy tính Windows khi đang ngồi tại máy làm việc.',
    steps: `1. Nhấn tổ hợp phím **Ctrl + Alt + Delete** trên bàn phím.
2. Chọn dòng **"Change a password"** (Đổi mật khẩu).
3. Nhập **Mật khẩu cũ** (Old password).
4. Nhập **Mật khẩu mới** (New password) và xác nhận lại ở ô bên dưới.
5. Nhấn **Enter** để hoàn tất.

*Chính sách mật khẩu: Tối thiểu 10 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt (VD: \`TechCorp@2026\`).*`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-pwd-forgot',
    title: 'Quên mật khẩu máy tính hoặc bị khóa tài khoản (Locked Out)',
    category: 'Tài khoản & Mật khẩu',
    categoryKey: 'ACCOUNT',
    keywords: ['quên mật khẩu', 'quên pass', 'khóa tài khoản', 'locked', 'sai mật khẩu', 'mở khóa tài khoản', 'reset pass', 'khóa domain'],
    summary: 'Xử lý khi quên mật khẩu hoặc tài khoản bị khóa do nhập sai quá 5 lần.',
    steps: `1. **Tự đặt lại mật khẩu SSPR**: Truy cập **passwordreset.microsoftonline.com** từ điện thoại, nhập email công ty và nhập mã OTP gửi về số điện thoại đăng ký.
2. **Khóa tạm thời 15 phút**: Nếu nhập sai quá 5 lần, hệ thống tự động khóa 15 phút theo quy định an toàn. Hết 15 phút bạn có thể nhập lại.
3. **Cần mở khóa ngay**: Nhấn nút **"Tạo Ticket Hỗ Trợ"** bên dưới để IT Admin mở khóa và cấp mật khẩu tạm thời ngay lập tức.`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-2fa-setup',
    title: 'Cài đặt xác thực 2 bước (Microsoft Authenticator)',
    category: 'Tài khoản & Mật khẩu',
    categoryKey: 'ACCOUNT',
    keywords: ['2fa', 'authenticator', 'xác thực 2 bước', 'otp', 'mã otp', 'bảo mật 2 lớp', 'mfa', 'microsoft authenticator'],
    summary: 'Cài đặt ứng dụng Microsoft Authenticator trên điện thoại để nhận mã xác thực đăng nhập an toàn.',
    steps: `1. Tải ứng dụng **Microsoft Authenticator** từ App Store (iOS) hoặc Google Play (Android).
2. Trên máy tính, truy cập trang **aka.ms/mfasetup** và đăng nhập bằng email công ty.
3. Mở app Authenticator trên điện thoại > Nhấn dấu **+ (Thêm tài khoản)** > Chọn **Tài khoản cơ quan hoặc trường học**.
4. Dùng camera điện thoại quét mã QR hiển thị trên màn hình máy tính để hoàn tất liên kết.`,
  },
  {
    id: 'kb-sec-policy',
    title: 'Quy định chính sách bảo mật mật khẩu công ty',
    category: 'Tài khoản & Mật khẩu',
    categoryKey: 'ACCOUNT',
    keywords: ['chính sách mật khẩu', 'quy định mật khẩu', 'thời hạn mật khẩu', 'đổi pass định kỳ', 'bao lâu đổi pass'],
    summary: 'Quy định an toàn thông tin về việc đặt và duy trì mật khẩu người dùng.',
    steps: `1. Mật khẩu có hiệu lực tối đa **90 ngày**. Trước khi hết hạn 7 ngày, hệ thống sẽ gửi email nhắc nhở.
2. Mật khẩu mới không được trùng với 5 mật khẩu đã sử dụng gần nhất.
3. Tuyệt đối không viết mật khẩu ra giấy dán lên màn hình hoặc chia sẻ cho người khác.`,
  },

  // ==================== 2. HỆ THỐNG MẠNG, WIFI & VPN ====================
  {
    id: 'kb-wifi-info',
    title: 'Thông tin các mạng WiFi văn phòng công ty & WiFi Khách',
    category: 'Mạng & WiFi',
    categoryKey: 'NETWORK',
    keywords: ['kết nối wifi cty', 'wifi cty', 'wifi cong ty', 'wifi văn phòng', 'pass wifi', 'mật khẩu wifi', 'wifi khách', 'wifi guest'],
    summary: 'Danh sách các mạng WiFi phát sóng tại tòa nhà văn phòng và cách kết nối.',
    steps: `1. **Mạng nội bộ nhân viên (\`TechCorp-CORP\`)**:
   - Dành cho máy tính, laptop và điện thoại của nhân viên công ty.
   - Xác thực bằng tài khoản Domain / Email công ty (không dùng mật khẩu chung).
2. **Mạng khách (\`TechCorp-GUEST\`)**:
   - Dành cho đối tác, khách hàng đến làm việc.
   - Mật khẩu truy cập: \`TechCorp@Welcome2026\` (tự động chuyển trang đăng ký thông tin).
3. **Mạng thiết bị IoT & Hội nghị (\`TechCorp-IOT\`)**:
   - Dành riêng cho màn hình tương tác, máy chấm công, camera và thiết bị phòng họp.`,
  },
  {
    id: 'kb-wifi-error',
    title: 'Xử lý lỗi WiFi chấm than vàng / "No Internet, Secured" / Rớt mạng',
    category: 'Mạng & WiFi',
    categoryKey: 'NETWORK',
    keywords: ['mất mạng', 'chấm than vàng', 'no internet', 'không vào được mạng', 'rớt mạng', 'lỗi mạng', 'đứt mạng', 'mạng lan'],
    summary: 'Khắc phục lỗi máy tính không kết nối được WiFi hoặc cắm cáp LAN bị dấu chấm than vàng.',
    steps: `1. Tắt WiFi trên máy tính, đợi 5 giây rồi bật lại và chọn kết nối lại vào mạng công ty.
2. Bấm phím **Windows + R**, gõ \`cmd\` rồi ấn Enter.
3. Gõ lần lượt 2 lệnh sau:
   - \`ipconfig /release\` (nhấn Enter để giải phóng IP cũ)
   - \`ipconfig /renew\` (nhấn Enter để xin cấp IP mới từ DHCP Server)
4. Nếu vẫn bị: Đổi DNS sang Google: Mở Network Connections > IPv4 > Đặt DNS: \`8.8.8.8\` và \`8.8.4.4\`.`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-vpn-forticlient',
    title: 'Hướng dẫn kết nối VPN làm việc từ xa (FortiClient VPN)',
    category: 'Mạng & WiFi',
    categoryKey: 'NETWORK',
    keywords: ['vpn', 'kết nối vpn', 'forticlient', 'làm việc từ xa', 'remote vpn', 'ngoài công ty', 'vpn gateway', 'ssl vpn'],
    summary: 'Cấu hình và đăng nhập VPN FortiClient để truy cập máy chủ nội bộ khi làm việc tại nhà.',
    steps: `1. Mở ứng dụng **FortiClient VPN** trên máy tính.
2. Kiểm tra thông số kết nối VPN:
   - **Connection Name**: \`TechCorp VPN\`
   - **VPN Type**: SSL-VPN
   - **Remote Gateway**: \`vpn.company.local\` (hoặc \`118.70.125.10\`)
   - **Customize Port**: \`10443\`
3. Nhập **Username** (email công ty) và **Password**.
4. Nhấn **Connect** và nhập mã OTP Authenticator nếu có yêu cầu.`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-vlan-layout',
    title: 'Sơ đồ phân bổ dải mạng VLAN toàn công ty (Dành cho KTV IT)',
    category: 'Mạng & WiFi',
    categoryKey: 'NETWORK',
    keywords: ['vlan', 'dải mạng', 'ip server', 'gateway', 'quy hoạch mạng', 'ip vlan', 'sơ đồ mạng'],
    summary: 'Quy hoạch dải địa chỉ IP và VLAN của hệ thống mạng nội bộ.',
    steps: `1. **VLAN 10 (\`192.168.10.0/24\`)**: Hệ thống Máy chủ Server Room & CSDL SQL (Gateway: \`192.168.10.1\`).
2. **VLAN 20 (\`192.168.20.0/24\`)**: Khối Văn phòng & Máy trạm làm việc (DHCP: \`.100\` - \`.250\`).
3. **VLAN 30 (\`192.168.30.0/24\`)**: Mạng WiFi Khách Guest (Cách ly hoàn toàn mạng nội bộ).
4. **VLAN 40 (\`192.168.40.0/24\`)**: Hệ thống Camera an ninh giám sát & Máy chấm công.
5. **VLAN 50 (\`192.168.50.0/24\`)**: Tổng đài điện thoại VoIP & Thiết bị họp trực tuyến.`,
  },
  {
    id: 'kb-internet-leasedline',
    title: 'Thông tin đường truyền Internet cáp quang & Hotline nhà mạng',
    category: 'Mạng & WiFi',
    categoryKey: 'NETWORK',
    keywords: ['đường truyền internet', 'leased line', 'nhà mạng', 'viettel', 'vnpt', 'fpt', 'đứt cáp', 'hotline mạng'],
    summary: 'Thông tin hợp đồng đường truyền cáp quang Leased Line và đầu mối liên hệ sự cố.',
    steps: `1. **Đường truyền chính (WAN 1)**: Viettel Leased Line 150Mbps quốc tế (IP Tĩnh: \`118.70.125.10\`) - Hợp đồng \`VT-CORP-2025\`. Hotline kỹ thuật Viettel IDC: **1800.8000** (nhánh 1).
2. **Đường truyền dự phòng (WAN 2)**: VNPT Fiber Doanh nghiệp 200Mbps (IP Tĩnh: \`14.162.80.25\`) - Hotline VNPT: **1800.1166**.
3. Hệ thống cấu hình tự động chuyển đổi (Dual WAN Failover) trong vòng 30 giây nếu một đường gặp sự cố.`,
  },

  // ==================== 3. EMAIL, OUTLOOK & MICROSOFT 365 ====================
  {
    id: 'kb-outlook-pwd-prompt',
    title: 'Khắc phục lỗi Outlook liên tục hỏi mật khẩu / Không nhận mật khẩu',
    category: 'Email & M365',
    categoryKey: 'EMAIL',
    keywords: ['outlook', 'lỗi outlook', 'hỏi mật khẩu outlook', 'không vào được mail', 'credentials', 'treo outlook', 'hòm thư'],
    summary: 'Xóa cache xác thực Windows Credentials khi Outlook không lưu mật khẩu mới.',
    steps: `1. Đóng hoàn toàn ứng dụng Outlook.
2. Mở **Control Panel** > chọn **Credential Manager** > chọn tab **Windows Credentials**.
3. Tại mục *Generic Credentials*, tìm và xóa toàn bộ các mục bắt đầu bằng \`MicrosoftOffice16_Data\` hoặc \`SSO_POP_User\` (nhấn vào mũi tên > chọn **Remove**).
4. Mở lại Outlook, nhập mật khẩu mới và tích chọn *"Remember my credentials"* (Ghi nhớ mật khẩu).`,
  },
  {
    id: 'kb-mailbox-full',
    title: 'Xử lý hòm thư Outlook bị đầy dung lượng (Mailbox is full)',
    category: 'Email & M365',
    categoryKey: 'EMAIL',
    keywords: ['đầy mail', 'hòm thư đầy', 'mailbox full', 'archive', 'lưu trữ mail', 'dung lượng mail', 'hộp thư đầy'],
    summary: 'Lưu trữ (Archive) email cũ sang file dữ liệu .PST trên ổ đĩa để giải phóng dung lượng hộp thư.',
    steps: `1. Trong Outlook, vào **File** > **Tools** (hoặc Cleanup Tools) > **Clean Up Old Items...** (hoặc Archive).
2. Chọn thư mục cần lưu trữ (Hộp thư đến / Đã gửi) và chọn mốc thời gian (VD: các email cũ hơn 6 tháng).
3. Chọn đường dẫn lưu file dữ liệu (VD: \`D:\\Email_Archive_2025.pst\`) và nhấn **OK**.
4. Vào thư mục **Deleted Items** (Thùng rác) và chọn **Empty Folder** để giải phóng dung lượng ngay.`,
  },
  {
    id: 'kb-email-signature',
    title: 'Hướng dẫn cài đặt chữ ký email chuẩn quy định công ty',
    category: 'Email & M365',
    categoryKey: 'EMAIL',
    keywords: ['chữ ký mail', 'cài chữ ký', 'signature', 'mẫu chữ ký', 'format chữ ký'],
    summary: 'Cài đặt mẫu chữ ký email chuẩn nhận diện thương hiệu công ty trên Outlook.',
    steps: `1. Trong Outlook, mở **File** > **Options** > **Mail** > chọn nút **Signatures...** (Chữ ký).
2. Nhấn **New** để tạo chữ ký mới (VD: \`Chữ ký chính\`).
3. Điền thông tin theo chuẩn:
   - Họ và tên (In đậm)
   - Chức danh - Phòng ban
   - Công ty Cổ phần TechCorp
   - Điện thoại di động / Email / Website
4. Tại mục *New messages* và *Replies/forwards*, chọn tên chữ ký vừa tạo để tự động chèn khi viết mail.`,
  },
  {
    id: 'kb-m365-install',
    title: 'Hướng dẫn tải và cài đặt bộ ứng dụng Microsoft 365 bản quyền',
    category: 'Email & M365',
    categoryKey: 'EMAIL',
    keywords: ['cài office', 'cài word', 'cài excel', 'microsoft 365', 'office 365', 'bản quyền office', 'tải office', 'cài teams'],
    summary: 'Tải và kích hoạt trọn bộ Word, Excel, PowerPoint, Teams theo tài khoản bản quyền doanh nghiệp.',
    steps: `1. Mở trình duyệt web và truy cập **portal.office.com**.
2. Đăng nhập bằng tài khoản email công ty (VD: \`ten.nhanvien@company.local\`).
3. Nhấp vào nút **Install Apps** (Cài đặt ứng dụng Office) ở góc trên bên phải màn hình.
4. Chạy file cài đặt vừa tải về, hệ thống sẽ tự động cài đặt và kích hoạt bản quyền hoàn toàn tự động.`,
  },

  // ==================== 4. MÁY IN, MÁY SCAN & PHOTO ====================
  {
    id: 'kb-printer-list',
    title: 'Danh sách địa chỉ IP máy in các tầng & Cách kết nối',
    category: 'Máy in & Scan',
    categoryKey: 'PRINTER',
    keywords: ['máy in', 'kết nối máy in', 'cài máy in', 'may in', 'in ấn', 'ip máy in', 'máy in tầng 1', 'máy in tầng 2', 'máy in tầng 3', 'máy in tầng 4'],
    summary: 'Danh sách địa chỉ IP máy in tại các tầng và hướng dẫn kết nối nhanh trong 10 giây.',
    steps: `1. **Danh sách máy in theo vị trí**:
   - **Tầng 1 (Lễ tân / Hành chính)**: Canon LBP 2900 (IP: \`192.168.1.201\`)
   - **Tầng 2 (Kế toán & Nhân sự)**: Ricoh MP 5002 In/Scan/Photo 2 mặt (IP: \`192.168.1.202\`)
   - **Tầng 3 (Ban Giám đốc & Phòng Họp)**: HP LaserJet Pro M404dn In 2 mặt (IP: \`192.168.1.203\`)
   - **Tầng 4 (Kinh doanh & Marketing)**: Canon imageRUNNER 2525 (IP: \`192.168.1.204\`)
2. **Cách kết nối**: Nhấn **Windows + R** > gõ \`\\\\192.168.1.250\` (Máy chủ in) > Nhấp đúp vào máy in tầng của bạn để tự động cài driver.`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-printer-stuck',
    title: 'Khắc phục kẹt lệnh in / Máy in báo Offline / Không in được',
    category: 'Máy in & Scan',
    categoryKey: 'PRINTER',
    keywords: ['kẹt lệnh in', 'không in được', 'máy in offline', 'spooler', 'hủy lệnh in', 'lỗi in', 'kẹt giấy'],
    summary: 'Khởi động lại dịch vụ Print Spooler để xóa sạch các lệnh in bị treo/lỗi.',
    steps: `1. Bấm **Windows + R**, gõ \`services.msc\` rồi nhấn Enter.
2. Tìm dịch vụ có tên **Print Spooler** > Nhấp chuột phải chọn **Restart** (Khởi động lại).
3. Bấm **Windows + R**, gõ \`spool\\printers\` và xóa toàn bộ các file tạm trong thư mục này.
4. Tắt nguồn máy in, đợi 10 giây rồi bật lại và thực hiện in lại.`,
  },
  {
    id: 'kb-scan-folder',
    title: 'Hướng dẫn cài đặt và sử dụng tính năng Scan to Folder (SMB)',
    category: 'Máy in & Scan',
    categoryKey: 'PRINTER',
    keywords: ['scan', 'máy scan', 'scan to folder', 'quét tài liệu', 'scan tài liệu', 'lấy file scan'],
    summary: 'Cách lấy tài liệu scan từ máy photo đa chức năng Ricoh về thư mục máy tính cá nhân.',
    steps: `1. Tạo một thư mục trên ổ đĩa máy tính (VD: \`D:\\SCAN_DATA\`) và bật chia sẻ mạng (Share: Everyone - Read/Write).
2. Tại máy photo Ricoh Tầng 2: Đặt tài liệu vào khay nạp > Chọn chế độ **Scanner**.
3. Chọn tên người nhận (Tên của bạn trong danh bạ máy photo) > Nhấn nút **Start** màu xanh để quét.
4. Sau 5 giây, file PDF scan sẽ tự động xuất hiện trong thư mục \`D:\\SCAN_DATA\` trên máy tính của bạn.`,
  },

  // ==================== 5. PHẦN MỀM CHUYÊN NGÀNH & BẢN QUYỀN ====================
  {
    id: 'kb-misa-sql-connect',
    title: 'Thông số kết nối CSDL Phần mềm Kế toán MISA SME / Bravo',
    category: 'Phần mềm & ERP',
    categoryKey: 'SOFTWARE',
    keywords: ['misa', 'kế toán', 'kết nối misa', 'sql server misa', 'bravo', 'lỗi misa', 'csdl kế toán', 'port 1433'],
    summary: 'Thông số cấu hình máy chủ SQL Server phần mềm kế toán doanh nghiệp.',
    steps: `1. **Thông số kết nối**:
   - **Máy chủ dữ liệu (Server)**: \`192.168.10.15,1433\` (SQL Server 2022)
   - **Tên Database**: \`MISA_SME_2026_TechCorp\`
   - **Xác thực**: SQL Server Authentication (User: \`misa_user_app\`)
2. **Lỗi không kết nối được**:
   - Kiểm tra máy tính đã kết nối đúng mạng nội bộ công ty (\`TechCorp-CORP\` hoặc cắm dây LAN).
   - Mở CMD gõ \`ping 192.168.10.15\` kiểm tra thông mạng.
3. Lịch sao lưu tự động (Backup): 23:00 hàng ngày lưu trữ sang NAS.`,
  },
  {
    id: 'kb-erp-sap-roles',
    title: 'Quy trình cấp tài khoản và phân quyền hệ thống ERP SAP',
    category: 'Phần mềm & ERP',
    categoryKey: 'SOFTWARE',
    keywords: ['erp', 'sap', 'phân quyền sap', 'tài khoản erp', 'cấp quyền erp', 'role sap'],
    summary: 'Quy trình tạo mới tài khoản và phân quyền các phân hệ ERP SAP cho nhân sự.',
    steps: `1. Tạo Phiếu yêu cầu truy cập hệ thống tại mục **Hỗ trợ > Yêu cầu & Phê duyệt** (\`/approvals\`).
2. Cần có phê duyệt của Trưởng bộ phận phụ trách.
3. Team IT-APP tiến hành tạo User theo chuẩn: \`ten.ho\` (VD: \`nam.nguyen\`) và gán Role tương ứng (Kế toán FI/CO, Mua hàng MM, Bán hàng SD).`,
  },
  {
    id: 'kb-usb-token-esign',
    title: 'Cài đặt và sử dụng USB Token chữ ký số (Viettel-CA, VNPT, MISA)',
    category: 'Phần mềm & ERP',
    categoryKey: 'SOFTWARE',
    keywords: ['chữ ký số', 'usb token', 'token', 'ký số', 'thuế điện tử', 'hóa đơn điện tử', 'viettel ca', 'vnpt ca', 'misa esign'],
    summary: 'Cài đặt driver Token Manager để ký số hóa đơn điện tử, tờ khai thuế, hải quan.',
    steps: `1. Cắm USB Token vào cổng USB máy tính.
2. Vào **This PC**, mở ổ đĩa ảo của USB Token và chạy file \`setup.exe\` để cài đặt Token Manager.
3. Mở phần mềm quản lý Token kiểm tra chứng thư số còn hạn sử dụng.
4. Cài tiện ích ký số tương ứng trên trình duyệt Chrome (VD: eSigner / Viettel Plugin) để ký hóa đơn.`,
  },

  // ==================== 6. THIẾT BỊ PHÒNG HỌP & HỘI NGHỊ TRỰC TUYẾN ====================
  {
    id: 'kb-meeting-polycom',
    title: 'Hướng dẫn sử dụng thiết bị phòng họp trực tuyến (Polycom / Teams Room)',
    category: 'Thiết bị Phòng Họp',
    categoryKey: 'MEETING',
    keywords: ['phòng họp', 'máy chiếu', 'polycom', 'loa mic', 'họp trực tuyến', 'teams room', 'chiếu màn hình', 'hdmi'],
    summary: 'Cách khởi động hệ thống âm thanh, camera Polycom và kết nối máy chiếu phòng họp lớn.',
    steps: `1. **Bật nguồn hệ thống**: Sử dụng bảng điều khiển cảm ứng Polycom trên bàn họp, nhấn nút **Power On**.
2. **Chiếu màn hình từ Laptop**:
   - Dùng cáp HDMI có sẵn trên bàn họp cắm vào Laptop (hoặc dùng Hub chuyển Type-C).
   - Nhấn tổ hợp phím **Windows + P** trên Laptop > Chọn **Duplicate** (Nhân đôi màn hình).
3. **Họp Microsoft Teams / Zoom**: Chọn thiết bị Camera là \`Poly Studio E70\` và Microphone là \`Polycom Table Mic\` để có âm thanh lọc ồn tốt nhất.`,
  },
  {
    id: 'kb-borrow-devices',
    title: 'Quy trình mượn thiết bị lưu động (Máy chiếu di động, Cáp chuyển, Hub)',
    category: 'Thiết bị Phòng Họp',
    categoryKey: 'MEETING',
    keywords: ['mượn thiết bị', 'mượn máy chiếu', 'mượn cáp hdmi', 'mượn hub', 'mượn loa jabra', 'mượn sạc'],
    summary: 'Mượn thiết bị ngoại vi phục vụ sự kiện, hội thảo hoặc đi công tác ngoài công ty.',
    steps: `1. Đến phòng IT (Tầng 3 - Tòa A) hoặc tạo yêu cầu mượn trước 2 giờ.
2. Danh mục thiết bị có sẵn: Máy chiếu di động Epson, Cáp HDMI 10m/15m, Hub Type-C đa năng, Loa hội nghị Jabra Speak 710, Bút chỉ laser slide.
3. Ký vào sổ mượn thiết bị và hoàn trả cho IT ngay sau khi kết thúc cuộc họp.`,
  },

  // ==================== 7. PHẦN CỨNG & QUY TRÌNH TÀI SẢN ====================
  {
    id: 'kb-hardware-specs-tier',
    title: 'Tiêu chuẩn cấu hình cấp phát máy tính theo vị trí làm việc',
    category: 'Cấp phát & Tài sản',
    categoryKey: 'APPROVAL',
    keywords: ['tiêu chuẩn cấp máy', 'cấu hình máy tính', 'cấp laptop', 'quy chuẩn thiết bị', 'tiêu chuẩn laptop', 'dell precision', 'thinkpad'],
    summary: 'Bảng tiêu chuẩn trang thiết bị làm việc theo từng nhóm vị trí công việc.',
    steps: `1. **Khối Lập trình viên / Kỹ sư (Dev/IT)**: Dell Precision / ThinkPad i7 Gen 13+, RAM 32GB, SSD 1TB NVMe, 02 Màn hình Dell 27 inch 2K.
2. **Khối Kế toán / Tài chính / Thiết kế**: Laptop Dell Latitude / HP ProBook Core i5/i7, RAM 16GB, SSD 512GB, 01 Màn hình phụ 24 inch.
3. **Khối Kinh doanh / Marketing / Hành chính**: Laptop mỏng nhẹ di động (Dell Vostro / HP Pavilion / ThinkBook) i5, RAM 16GB, SSD 512GB.
4. Thời hạn khấu hao và xem xét đổi máy mới: **03 năm đối với Laptop** và **04 năm đối với PC để bàn**.`,
  },
  {
    id: 'kb-hardware-request',
    title: 'Quy trình xin cấp mới hoặc đổi máy tính/laptop hỏng',
    category: 'Cấp phát & Tài sản',
    categoryKey: 'APPROVAL',
    keywords: ['xin cấp máy', 'cấp laptop', 'đổi máy tính', 'đổi laptop', 'máy mới', 'thay máy', 'mượn máy', 'xin cấp mới'],
    summary: 'Quy trình lập phiếu yêu cầu xin cấp mới thiết bị hoặc đổi máy tính qua hệ thống phê duyệt.',
    steps: `1. Vào menu **Hỗ trợ** > **Yêu cầu & Phê duyệt** (\`/approvals\`).
2. Nhấn nút **"Tạo Yêu Cầu Mới"** góc trên bên phải.
3. Chọn loại yêu cầu:
   - **Cấp mới thiết bị**: Dành cho nhân sự mới hoặc trang bị thêm màn hình/laptop.
   - **Thay thế / Đổi thiết bị**: Khi máy tính hiện tại quá cũ, hỏng hóc không thể sửa chữa.
4. Nhập cấu hình dự kiến, lý do và chọn Người phê duyệt (Trưởng bộ phận).
5. Nhấn **Gửi Phê Duyệt**. Sau khi duyệt, IT sẽ xuất kho hoặc tiến hành mua sắm bàn giao.`,
  },
  {
    id: 'kb-offboarding-checklist',
    title: 'Checklist thu hồi tài sản khi nhân viên nghỉ việc (Offboarding)',
    category: 'Cấp phát & Tài sản',
    categoryKey: 'APPROVAL',
    keywords: ['nghỉ việc', 'thu hồi tài sản', 'offboarding', 'trả máy', 'thu hồi laptop', 'bàn giao tài sản'],
    summary: 'Các bước kiểm tra và thu hồi trang thiết bị khi nhân sự kết thúc hợp đồng lao động.',
    steps: `1. Thu hồi Laptop, Sạc Adapter chính hãng, Chuột, Balo công ty.
2. Kiểm tra tình trạng vật lý (nứt vỡ, móp méo, màn hình điểm chết).
3. Bàn giao dữ liệu công việc cho Quản lý trực tiếp > Ký Biên bản bàn giao thu hồi tài sản trên SIMPLY IT.
4. IT tiến hành Reset Windows sạch (Sysprep / Clean Install) và nhập kho trạng thái Available để chuẩn bị cấp phát tiếp theo.`,
  },
  {
    id: 'kb-bsod-error',
    title: 'Xử lý máy tính bị màn hình xanh chết chóc (BSOD Stop Code)',
    category: 'Phần cứng & Thiết bị',
    categoryKey: 'HARDWARE',
    keywords: ['màn hình xanh', 'dump', 'bsod', 'blue screen', 'sập nguồn', 'treo máy', 'khởi động lại liên tục'],
    summary: 'Các bước kiểm tra nhanh mã lỗi STOP Code khi máy tính tự động khởi động lại màn hình xanh.',
    steps: `1. Chụp lại ảnh màn hình xanh (đặc biệt là dòng Stop Code như: \`MEMORY_MANAGEMENT\`, \`CRITICAL_PROCESS_DIED\`, \`DRIVER_IRQL\`).
2. Nhấn giữ nút nguồn 10 giây để tắt hẳn máy, sau đó bật lại xem có vào được Windows bình thường không.
3. Rút các thiết bị ngoại vi mới cắm (USB, chuột lạ, ổ cứng di động).
4. Nhấn nút **"Tạo Ticket Hỗ Trợ"** bên dưới kèm ảnh chụp mã lỗi để KTV IT mang linh kiện RAM/ổ cứng đến kiểm tra thay thế.`,
    requiresTicketIfFailed: true,
  },
  {
    id: 'kb-slow-pc',
    title: 'Khắc phục máy tính bị chậm, đơ lag, 100% Disk hoặc đầy ổ C',
    category: 'Phần cứng & Thiết bị',
    categoryKey: 'HARDWARE',
    keywords: ['máy chậm', 'đơ máy', 'lag', '100% disk', 'đầy ổ c', 'dọn rác', 'treo máy', 'tăng tốc máy'],
    summary: 'Dọn dẹp file tạm, tắt ứng dụng khởi động cùng Windows để tăng tốc máy tính.',
    steps: `1. **Dọn file rác**: Bấm **Windows + R**, gõ \`%temp%\` > Chọn tất cả (Ctrl + A) và nhấn **Delete**.
2. **Tắt app khởi động cùng máy**: Nhấn **Ctrl + Shift + Esc** mở Task Manager > tab **Startup** > Chọn các app không cần thiết (Zalo, Spotify, Skype...) và nhấn **Disable**.
3. **Kiểm tra dung lượng ổ C**: Ổ C cần trống tối thiểu 15GB để Windows hoạt động mượt mà.
4. Nếu máy vẫn chậm do cấu hình thấp (RAM 4GB / Ổ cứng HDD), hãy làm đơn xin nâng cấp RAM/SSD qua mục Phê duyệt.`,
  },
  {
    id: 'kb-ransomware-emergency',
    title: 'Kế hoạch ứng phó khẩn cấp khi nghi ngờ dính Virus / Ransomware',
    category: 'Bảo mật & An toàn',
    categoryKey: 'ACCOUNT',
    keywords: ['virus', 'mã độc', 'ransomware', 'tống tiền', 'mã hóa file', 'cứu dữ liệu', 'nhiễm virus', 'bị hack'],
    summary: 'Quy trình xử lý khẩn cấp khi phát hiện máy tính bị đổi đuôi file hoặc có thông báo tống tiền.',
    steps: `1. **Bước 1 (Cô lập ngay lập tức)**: RÚT NGAY DÂY MẠNG LAN và TẮT WIFI trên máy tính. TUYỆT ĐỐI KHÔNG TẮT NGUỒN ĐỘT NGỘT.
2. **Bước 2 (Báo động)**: Gọi ngay Hotline IT Khẩn cấp hoặc tạo Ticket mức độ URGENT P1.
3. **Bước 3 (Khoanh vùng)**: IT rà soát log Firewall để phát hiện các kết nối bất thường ra bên ngoài.
4. **Bước 4 (Khôi phục)**: Quét sạch virus và khôi phục dữ liệu từ bản sao lưu độc lập (Cold Backup) trước thời điểm tấn công.`,
    requiresTicketIfFailed: true,
  },
];
