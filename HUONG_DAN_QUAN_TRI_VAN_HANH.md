# 📘 SỔ TAY QUẢN TRỊ & VẬN HÀNH HỆ THỐNG (ADMIN & OPERATIONS GUIDE)
> **Hệ thống Quản lý Tài sản IT & Service Desk Doanh nghiệp — Simply IT Community Edition (CE)**  
> *Dành riêng cho Quản trị viên IT (IT Admin) & Đội ngũ Kỹ thuật viên (IT Support)*

---

## 📑 MỤC LỤC
1. [Cấu Hình Đăng Nhập Một Chạm Microsoft 365 (SSO Azure AD)](#1-cấu-hình-đăng-nhập-một-chạm-microsoft-365-sso-azure-ad)
2. [Đồng Bộ Tài Khoản Windows Server Active Directory (LDAP)](#2-đồng-bộ-tài-khoản-windows-server-active-directory-ldap)
3. [Thiết Lập Kênh Cảnh Báo & Webhook (Telegram, Zalo OA, Teams)](#3-thiết-lập-kênh-cảnh-báo--webhook-telegram-zalo-oa-teams)
4. [Vận Hành Phân Hệ Tài Sản IT (ITAM) & In Tem Mã QR Hàng Loạt](#4-vận-hành-phân-hệ-tài-sản-it-itam--in-tem-mã-qr-hàng-loạt)
5. [Quét Mã QR Bằng Điện Thoại & Triển Khai Script Tự Động Quét Máy](#5-quét-mã-qr-bằng-điện-thoại--triển-khai-script-tự-động-quét-máy)
6. [Quy Trình Thu Hồi Thiết Bị Thôi Việc & Biên Bản Số Hóa](#6-quy-trình-thu-hồi-thiết-bị-thôi-việc--biên-bản-số-hóa)
7. [Két Mật Khẩu Doanh Nghiệp (Password Vault) & Chia Sẻ Tự Hủy](#7-két-mật-khẩu-doanh-nghiệp-password-vault--chia-sẻ-tự-hủy)
8. [Dự Báo Ngân Sách IT 12 Tháng & Bảo Trì Dự Đoán Bằng AI](#8-dự-báo-ngân-sách-it-12-tháng--bảo-trì-dự-đoán-bằng-ai)

---

## 1. CẤU HÌNH ĐĂNG NHẬP MỘT CHẠM MICROSOFT 365 (SSO AZURE AD)

Tính năng SSO cho phép toàn thể nhân viên trong công ty đăng nhập vào hệ thống Simply IT bằng chính tài khoản email công ty `@company.com` mà không cần nhớ thêm mật khẩu riêng.

### Bước 1.1: Tạo Ứng dụng trên Microsoft Entra ID (Azure Portal)
1. Đăng nhập vào [https://portal.azure.com](https://portal.azure.com) với quyền **Global Administrator** hoặc **Application Administrator**.
2. Tìm kiếm dịch vụ: **Microsoft Entra ID** (trước đây là Azure Active Directory).
3. Vào menu bên trái chọn **App registrations (Đăng ký ứng dụng)** ➔ Bấm **+ New registration (+ Đăng ký mới)**.
4. Điền các thông tin:
   - **Name:** `Simply IT Management System`
   - **Supported account types:** Chọn dòng 1 *(Accounts in this organizational directory only - Single tenant)*.
   - **Redirect URI:** Chọn nền tảng **Web** và nhập chính xác đường link ứng dụng của bạn:
     - Chạy thử nghiệm nội bộ: `http://localhost:3001/api/auth/sso/ms365/callback`
     - Chạy qua HTTPS: `https://localhost:3443/api/auth/sso/ms365/callback`
     - Chạy trên tên miền máy chủ: `https://it.company.com/api/auth/sso/ms365/callback`
5. Bấm **Register (Đăng ký)**.

> ⚠️ **LƯU Ý TRÁNH LỖI AADSTS50011:** Đường link Redirect URI bạn khai báo trên Azure Portal phải **trùng khớp 100%** với địa chỉ mà người dùng gõ trên thanh trình duyệt. Nếu công ty chạy cổng nào thì phải thêm đúng cổng đó vào mục **Authentication** trên Azure Portal.

### Bước 1.2: Tạo Khóa Bí Mật (Client Secret)
1. Tại màn hình ứng dụng vừa tạo, vào menu **Certificates & secrets** ➔ Chọn tab **Client secrets** ➔ Bấm **+ New client secret**.
2. Đặt mô tả (ví dụ: `Simply IT Key 2026`) và chọn hạn dùng (ví dụ: 24 tháng).
3. Bấm **Add**. **Sao chép ngay giá trị tại cột `Value`** *(Lưu ý: Microsoft chỉ hiển thị chuỗi này 1 lần duy nhất)*.

### Bước 1.3: Cấp Quyền Đọc Thông Tin Nhân Viên (API Permissions)
1. Vào menu **API permissions** ➔ Bấm **+ Add a permission** ➔ Chọn **Microsoft Graph**.
2. Chọn **Delegated permissions**, tích chọn các quyền:
   - `User.Read` *(Đọc hồ sơ nhân viên khi đăng nhập)*
   - `email`, `openid`, `profile`
3. Chọn **Application permissions** (nếu muốn tự động đồng bộ danh bạ):
   - `User.Read.All`
4. Bấm **Grant admin consent for [Tên công ty]** để phê duyệt quyền.

### Bước 1.4: Điền Cấu Hình Vào Simply IT
1. Mở Simply IT với quyền Admin ➔ Vào **Cài Đặt (Settings)** ➔ Chọn tab **Đăng Nhập SSO Microsoft 365**.
2. Điền các trường:
   - **Bật SSO:** Gạt sang trạng thái **Đang BẬT**.
   - **Application (Client) ID:** Dán mã Client ID từ trang Overview của Azure.
   - **Directory (Tenant) ID:** Dán mã Tenant ID từ trang Overview của Azure.
   - **Client Secret:** Dán chuỗi bí mật vừa tạo ở Bước 1.2.
3. Bấm **Kiểm Tra Kết Nối** ➔ Nhận thông báo tích xanh thành công ➔ Bấm **Lưu Cấu Hình**.

---

## 2. ĐỒNG BỘ TÀI KHOẢN WINDOWS SERVER ACTIVE DIRECTORY (LDAP)

Dành cho doanh nghiệp sử dụng máy chủ Windows Server nội bộ:
1. Vào **Cài Đặt** ➔ Chọn tab **Xác Thực LDAP / Active Directory**.
2. Bật công tắc kích hoạt LDAP.
3. Điền thông số kết nối:
   - **Server URL:** `ldap://192.168.1.10:389` (hoặc `ldaps://192.168.1.10:636` nếu có chứng chỉ SSL).
   - **Base DN:** `DC=company,DC=local`
   - **Bind DN (Tài khoản dịch vụ):** `CN=LdapService,OU=ServiceAccounts,DC=company,DC=local`
   - **Bind Password:** Mật khẩu của tài khoản Bind DN.
   - **User Search Filter:** `(&(objectClass=user)(sAMAccountName={{username}}))`
4. Bấm **Kiểm Tra Kết Nối LDAP** để thử nghiệm xác thực trước khi lưu.

---

## 3. THIẾT LẬP KÊNH CẢNH BÁO & WEBHOOK (TELEGRAM, ZALO OA, TEAMS)

Hệ thống có khả năng tự động "bắn tin" cảnh báo khẩn cấp khi có Ticket ưu tiên cao (P1 Khẩn Cấp), thiết bị sắp hết hạn bảo hành, hợp đồng Internet sắp gia hạn hoặc phụ tùng kho bị cạn:

### A. Cảnh Báo Qua Telegram Bot (Khuyên Dùng — Miễn phí 100%):
1. Mở Telegram, tìm bot `@BotFather` để tạo bot mới bằng lệnh `/newbot` ➔ Nhận được **Bot Token**.
2. Tạo nhóm Telegram của đội IT (ví dụ: `IT Helpdesk Team`), thêm Bot vừa tạo vào nhóm.
3. Lấy Chat ID của nhóm (bằng cách thêm bot `@RawDataBot` vào nhóm để xem số `chat_id`, thường có dấu trừ đằng trước, ví dụ: `-100123456789`).
4. Vào **Cài Đặt** ➔ **Cảnh Báo Tự Động** ➔ Bật Telegram và dán **Bot Token** cùng **Chat ID**.
5. Bấm **Gửi Tin Thử Nghiệm** để kiểm tra ngay trên điện thoại.

### B. Webhook Vào Microsoft Teams / Zalo:
1. Vào **Cài Đặt** ➔ **Webhook Đa Kênh (Teams/Zalo)**.
2. Thêm Webhook URL của kênh Teams (Incoming Webhook) hoặc Zalo Webhook.
3. Chọn các sự kiện muốn nhận:
   - `ticket.created`: Có nhân viên gửi yêu cầu hỗ trợ mới.
   - `ticket.urgent`: Có sự cố khẩn cấp P1.
   - `license.expiry`: Bản quyền phần mềm sắp hết hạn trước 30 ngày.
   - `service.renewal`: Hợp đồng Internet / Thuê bao Cloud sắp gia hạn.

---

## 4. VẬN HÀNH PHÂN HỆ TÀI SẢN IT (ITAM) & IN TEM MÃ QR HÀNG LOẠT

### A. Quản lý Vòng Đời Thiết Bị:
- **Nhập thiết bị mới:** Bấm **+ Thêm Thiết Bị**, chọn danh mục, điền số Serial Number, ngày mua và giá mua để hệ thống tự động tính toán khấu hao tài chính hàng tháng.
- **Mã Tài Sản (Asset Tag):** Hệ thống tự động sinh theo mẫu chuẩn doanh nghiệp `IT-AST-0001`, `IT-AST-0002`... liên tục và không giới hạn.
- **Bàn giao cho nhân viên:** Chọn trạng thái `IN_USE` và gán cho người dùng tương ứng.

### B. In Tem Decal Mã QR Hàng Loạt:
1. Tại trang **Quản Lý Danh Mục Tài Sản IT**, tích chọn các thiết bị cần in tem (hoặc chọn tất cả).
2. Bấm nút **In Tem Hàng Loạt (Batch Print QR)** trên thanh công cụ.
3. Chọn khổ giấy in:
   - Giấy in nhãn Decal mã vạch cuộn (ví dụ khổ 2 tem 70x22mm hoặc 35x25mm).
   - Giấy in văn phòng tiêu chuẩn A4 (Lưới tem cắt).
4. Hệ thống tự động căn chỉnh mã QR, Mã tài sản (Tag), Tên máy, Serial Number rõ nét để dán lên thân máy tính, màn hình, máy in.

---

## 5. QUÉT MÃ QR BẰNG ĐIỆN THOẠI & TRIỂN KHAI SCRIPT TỰ ĐỘNG QUÉT MÁY

### A. Kiểm Kê Thực Địa Bằng Điện Thoại Di Động:
- Kỹ thuật viên IT chỉ cần cầm điện thoại hoặc máy tính bảng truy cập vào địa chỉ hệ thống ➔ Bấm nút **📱 Quét QR Mobile**.
- Camera điện thoại mở lên, lia vào tem QR trên máy tính:
  - Màn hình lập tức hiển thị thông tin máy tính: Ai đang dùng, cấu hình CPU/RAM, tình trạng bảo hành, lịch sử bảo trì.
  - KTV có thể bấm nút **Xác Nhận Đã Kiểm Kê** ngay tại chỗ để hệ thống ghi vết GPS/Thời gian kiểm kê.

### B. Tự Động Quét Cấu Hình Máy Bằng PowerShell Agent (Không Cần Cài App):
1. Bấm nút **Tải Agent / Script PS1** trên trang Quản lý tài sản.
2. Tải về file script `Audit-PC.ps1`.
3. Triển khai:
   - **Cách 1 (Chạy thủ công):** Mở PowerShell với quyền Admin trên máy người dùng và chạy script.
   - **Cách 2 (Doanh nghiệp lớn):** Gán script này vào **GPO (Group Policy Object)** của Windows Server để mỗi khi nhân viên bật máy, máy tính tự động gửi thông số (CPU, RAM, Ổ cứng, Serial BIOS, Windows Defender, BitLocker) về máy chủ Simply IT.

---

## 6. QUY TRÌNH THU HỒI THIẾT BỊ THÔI VIỆC & BIÊN BẢN SỐ HÓA

Khi một nhân sự nghỉ việc, việc thu hồi tài sản và bảo mật dữ liệu doanh nghiệp là cực kỳ quan trọng:

1. Vào danh sách **Người Dùng / Nhân Sự** ➔ Tìm nhân viên nghỉ việc ➔ Bấm menu **Thao tác ➔ Thôi Việc / Offboarding**.
2. **Hệ thống tự động thực hiện chuỗi hành động nguyên tử:**
   - Thu hồi toàn bộ bản quyền phần mềm (Office 365, Zoom, Adobe...) nhàn rỗi để trả về kho cấp cho người khác.
   - Máy tính **KHÔNG chuyển sang trạng thái Sẵn Sàng (AVAILABLE) ngay**, mà được chuyển sang trạng thái **`MAINTENANCE` (Bảo trì & Khử trùng dữ liệu)**.
   - Tự động tạo một phiếu kỹ thuật: *Yêu cầu KTV kiểm tra phần cứng, sao lưu dữ liệu cần thiết và format sạch ổ cứng (sanitize) trước khi tái nhập kho*.
   - Khóa tài khoản đăng nhập và **hủy phiên làm việc (JWT Revocation)** ngay lập tức trong 0 giây.
   - Tự động sinh **Biên Bản Bàn Giao & Thu Hồi Thiết Bị Số Hóa** định dạng chuẩn (Mã số dạng `BBTH-YYYYMM/TÊN_NHÂN_VIÊN`), có thể xuất ra file Word/PDF để ký nhận.

---

## 7. KÉT MẬT KHẨU DOANH NGHIỆP (PASSWORD VAULT) & CHIA SẺ TỰ HỦY

### A. Quản Lý Mật Khẩu Chuẩn Zero-Trust:
- Mọi mật khẩu máy chủ, WiFi nội bộ, tài khoản dịch vụ đám mây đều được mã hóa bằng thuật toán quân sự **AES-256-GCM**.
- Mật khẩu trên màn hình luôn được che mờ `••••••••`. Muốn xem phải có quyền và phải nhập **Mật Khẩu Cấp 2 (Master Passphrase)**.
- Phân quyền theo nhóm phòng ban (Nhóm Kỹ thuật, Nhóm Kế toán, Nhóm Ban Giám Đốc).

### B. Tính Năng Chia Sẻ Mật Khẩu Tự Hủy (Auto-Burn Secret Link):
- Khi cần gửi mật khẩu WiFi VIP hoặc tài khoản cho đối tác/nhân sự từ xa:
  1. Bấm nút **Chia Sẻ An Toàn (Share Secret)**.
  2. Đặt mật mã bảo vệ (Passphrase) và thời hạn tự hủy (ví dụ: 1 giờ hoặc sau 1 lần xem).
  3. Hệ thống tạo ra một đường link duy nhất.
- **Cơ chế chống dò mật khẩu:** Nếu đối tác nhập sai mật mã bảo vệ quá **5 lần**, hệ thống sẽ **lập tức xóa vĩnh viễn (auto-burn)** bản ghi mật khẩu khỏi CSDL để triệt tiêu nguy cơ brute-force.

---

## 8. DỰ BÁO NGÂN SÁCH IT 12 THÁNG & BẢO TRÌ DỰ ĐOÁN BẰNG AI

Vào menu **Báo Cáo & Dự Toán IT (IT Budget & TCO)**:
1. **Dự toán Dòng Tiền 12 Tháng (Cash Flow Forecast):** Hệ thống quét toàn bộ hợp đồng dịch vụ Internet, tiền bản quyền phần mềm sắp đến hạn và chi phí thay thế phần cứng hao mòn để vẽ biểu đồ dòng tiền ngân sách cần chuẩn bị cho từng tháng trong năm tới.
2. **Bảo Trì Dự Đoán (Predictive Maintenance):** Thuật toán tự động chấm điểm sức khỏe phần cứng (`HealthScore 0 - 100`) dựa trên tuổi thọ thiết bị, lịch sử sự cố và nhiệt độ ổ đĩa để đề xuất lịch bảo trì trước khi máy tính bị hỏng đột ngột, giúp doanh nghiệp chủ động 100% trong vận hành.
