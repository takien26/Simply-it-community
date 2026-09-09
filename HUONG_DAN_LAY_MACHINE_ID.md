# HƯỚNG DẪN LẤY MÃ MÁY CHỦ (MACHINE ID) & KÍCH HOẠT BẢN QUYỀN
### HỆ THỐNG QUẢN TRỊ VẬN HÀNH & TÀI SẢN CNTT — SIMPLY IT

---

## I. TỔNG QUAN VỀ MÃ ĐỊNH DANH MÁY CHỦ (MACHINE ID)

### 1. Machine ID là gì?
**Machine ID (Hardware Fingerprint)** là chuỗi mã định danh phần cứng duy nhất được sinh ra từ máy chủ (Server/PC) đang cài đặt phần mềm SIMPLY IT. 

Chuỗi mã này được sử dụng để phát hành **Giấy Phép Bản Quyền Doanh Nghiệp (Enterprise License)** có tính năng bảo mật khóa theo máy chủ, giúp bảo vệ quyền sở hữu trí tuệ và chống sao chép trái phép.

### 2. Định dạng chuẩn của Machine ID
Mã Machine ID có định dạng gồm 4 nhóm ký tự lục phân viết hoa kèm tiền tố:
```
SIMPLY-HW-XXXX-XXXX-XXXX-XXXX
```
*Ví dụ thực tế:* `SIMPLY-HW-FE18-E40A-551A-E2F0`

### 3. Nguyên tắc trích xuất phần cứng (Không phụ thuộc card mạng)
Để đảm bảo tính cố định tuyệt đối nhưng không gây phiền toái cho khách hàng khi thay đổi hạ tầng mạng, SIMPLY IT chỉ trích xuất từ 2 lớp phần cứng nền tảng:
* **UUID Bo Mạch Chủ (Motherboard / BIOS UUID):** Mã định danh phần cứng gốc của hãng sản xuất máy chủ (Dell, HP, Lenovo...) hoặc do Hypervisor (VMware ESXi, Hyper-V, Proxmox) gán cố định cho máy ảo.
* **CPU Processor ID:** Mã định danh chip vi xử lý của máy chủ.
* **Hoàn toàn KHÔNG dùng địa chỉ MAC card mạng:** Khách hàng có thể thay đổi card mạng, đổi cổng LAN, cắm USB Ethernet, gắn thêm card Wi-Fi hoặc cấu hình Network Teaming/Bonding mà **không bao giờ bị lỗi hay mất bản quyền**.

---

## II. CÁCH LẤY MACHINE ID (2 PHƯƠNG PHÁP)

### PHƯƠNG PHÁP 1: LẤY QUA GIAO DIỆN WEB (KHUYÊN DÙNG — 1 CHẠM)
Đây là cách đơn giản và nhanh nhất, áp dụng cho mọi người dùng và quản trị viên hệ thống:

1. **Bước 1:** Mở trình duyệt và đăng nhập vào hệ thống **SIMPLY IT** với tài khoản Quản trị viên (Admin).
2. **Bước 2:** Truy cập vào menu **Cài Đặt** ➔ Chọn tab **Bản Quyền & Phiên Bản** (hoặc truy cập trực tiếp đường dẫn `http://<IP_Server>:3001/settings?tab=license`).
3. **Bước 3:** Quan sát khối **Mã Định Danh Máy Chủ (Machine ID)** ngay đầu trang:
   * Mã máy chủ của bạn sẽ hiển thị rõ ràng tại đây (ví dụ: `SIMPLY-HW-FE18-E40A-551A-E2F0`).
4. **Bước 4:** Nhấn nút **[Sao chép Mã Máy]** (Copy Machine ID).
5. **Bước 5:** Dán (Paste) chuỗi mã này gửi cho Nhà cung cấp phần mềm qua Zalo / Email để nhận Mã Giấy Phép Bản Quyền (License Key).

---

### PHƯƠNG PHÁP 2: LẤY QUA DÒNG LỆNH TERMINAL / CLI
Áp dụng cho chuyên viên kỹ thuật triển khai máy chủ Linux không có giao diện đồ họa (Headless Server) hoặc khi chưa khởi động giao diện web:

#### 1. Trên hệ điều hành Windows (PowerShell / Command Prompt):
Mở PowerShell tại thư mục cài đặt dự án SIMPLY IT và thực thi lệnh:
```powershell
node -e "const { getMachineId } = require('./src/lib/machine-id.ts'); console.log(getMachineId());"
```
*Kết quả in ra màn hình:* `SIMPLY-HW-FE18-E40A-551A-E2F0`

*(Hoặc kiểm tra thông số phần cứng gốc của Windows)*:
* UUID Bo mạch: `powershell "(Get-CimInstance Win32_ComputerSystemProduct).UUID"`
* CPU ID: `powershell "(Get-CimInstance Win32_Processor).ProcessorId"`

#### 2. Trên hệ điều hành Linux / Ubuntu Server (Bash Shell):
Mở terminal SSH vào máy chủ và chạy:
```bash
node -e "const { getMachineId } = require('./src/lib/machine-id.ts'); console.log(getMachineId());"
```
*(Hoặc xem file định danh phần cứng Linux)*:
* UUID Bo mạch: `cat /sys/class/dmi/id/product_uuid` (hoặc `cat /etc/machine-id`)
* CPU ID: `grep 'model name' /proc/cpuinfo | head -n 1`

#### 3. Trên môi trường Docker Container:
Nếu SIMPLY IT đang chạy trong Docker container, đứng từ máy Host chạy lệnh:
```bash
docker exec -it simply-it-app node -e "const { getMachineId } = require('./src/lib/machine-id.ts'); console.log(getMachineId());"
```

---

## III. HƯỚNG DẪN KÍCH HOẠT BẢN QUYỀN SAU KHI NHẬN KEY

Sau khi gửi Machine ID, bạn sẽ nhận được một chuỗi **Mã Bản Quyền (License Key)** bắt đầu bằng `SIMPLY-ENT-...` kèm chữ ký số RSA 2048-bit bảo mật.

1. Đăng nhập vào hệ thống SIMPLY IT với tài khoản Admin.
2. Vào mục **Cài Đặt** ➔ Chọn tab **Bản Quyền & Phiên Bản**.
3. Dán toàn bộ chuỗi mã nhận được vào ô **Mã Bản Quyền (License Key)**.
4. Nhấn nút **Kích Hoạt Giấy Phép (Activate Enterprise License)**.
5. Hệ thống sẽ lập tức xác thực chữ ký số và đối soát Machine ID:
   * Thông báo thành công: **"Kích hoạt bản quyền Enterprise thành công!"**.
   * Badge trạng thái chuyển sang: **👑 ENTERPRISE EDITION**.
   * Trạng thái khóa máy chủ: **🔒 Đã khóa theo máy chủ này** (hoặc `🌐 Giấy phép mở` nếu là key không khóa).
   * Thời hạn bản quyền hiển thị: **Vĩnh viễn** *(hoặc số ngày tương ứng theo hợp đồng)*.
   * Toàn bộ 9 phân hệ doanh nghiệp nâng cao (SSO M365, Active Directory, Webhooks, Phân tuyến SLA, Gemini AI & OCR, Quét hạn Telegram, Kiểm kê Tài sản, Scan Thiết bị & Mạng, Sơ đồ Mặt bằng 2D) sẽ được mở khóa 100%.

---

## IV. QUY TRÌNH HỖ TRỢ ĐỔI MÁY CHỦ KHI GẶP SỰ CỐ PHẦN CỨNG

Khách hàng mua bản quyền SIMPLY IT hoàn toàn yên tâm khi vận hành dài hạn:

1. **Khi nào cần đổi Machine ID?**
   * Máy chủ vật lý bị hỏng Bo Mạch Chủ (Mainboard) hoặc thay thế chip CPU chính.
   * Đơn vị nâng cấp, chuyển đổi toàn bộ hệ thống sang máy chủ vật lý mới hoặc cụm máy ảo mới.
2. **Quy trình thực hiện:**
   * **Bước 1:** Khách hàng cài đặt SIMPLY IT lên máy chủ mới theo tài liệu hướng dẫn.
   * **Bước 2:** Lấy mã **Machine ID mới** của máy chủ đó theo Phần II ở trên.
   * **Bước 3:** Gửi mã Machine ID mới cho Bộ phận Chăm sóc Khách hàng SIMPLY IT.
   * **Bước 4:** Quản trị viên SIMPLY IT sẽ sử dụng công cụ **License Studio** ➔ Chọn tính năng **"✏️ Đổi Máy"** trên bản ghi của quý khách ➔ Dán Machine ID mới và ký lại mã key mới.
   * **Bước 5:** Quý khách dán mã key mới vào hệ thống trên máy mới để tiếp tục sử dụng bình thường. Toàn bộ thời hạn và quyền lợi bản quyền được bảo lưu trọn vẹn 100%.

---
**TRUNG TÂM PHÁT TRIỂN & HỖ TRỢ KỸ THUẬT SIMPLY IT**  
*Hotline / Zalo Hỗ Trợ:* Liên hệ Quản trị viên phụ trách  
*Email:* support@simply-it.vn  
*Phiên bản tài liệu:* 2.0 (Cập nhật tháng 09/2026)
