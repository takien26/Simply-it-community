# HƯỚNG DẪN LẤY MÃ MÁY CHỦ (MACHINE ID) & KÍCH HOẠT BẢN QUYỀN
### HỆ THỐNG QUẢN TRỊ VẬN HÀNH & TÀI SẢN CNTT — SIMPLY IT

---

## I. TỔNG QUAN VỀ MÃ ĐỊNH DANH MÁY CHỦ (MACHINE ID)

### 1. Machine ID là gì?
**Machine ID (Hardware Fingerprint)** là chuỗi mã định danh phần cứng duy nhất được sinh ra từ máy chủ (Server/PC/Máy ảo) đang cài đặt phần mềm SIMPLY IT. 

Chuỗi mã này được sử dụng để phát hành **Giấy Phép Bản Quyền Doanh Nghiệp (Enterprise License Certificate)** có tính năng bảo mật khóa theo máy chủ, giúp bảo vệ quyền sở hữu trí tuệ và chống sao chép trái phép.

### 2. Định dạng chuẩn của Machine ID
Mã Machine ID có định dạng gồm 4 nhóm ký tự lục phân viết hoa kèm tiền tố:
```
SIMPLY-HW-XXXX-XXXX-XXXX-XXXX
```
*Ví dụ thực tế:* `SIMPLY-HW-FE18-E40A-551A-E2F0`

### 3. Nguyên tắc trích xuất phần cứng (Không phụ thuộc card mạng)
Để đảm bảo tính cố định tuyệt đối nhưng không gây phiền toái cho khách hàng khi thay đổi hạ tầng mạng, SIMPLY IT chỉ trích xuất từ 2 lớp phần cứng nền tảng:
* **UUID Bo Mạch Chủ (Motherboard / BIOS UUID):** Mã định danh phần cứng gốc của hãng sản xuất máy chủ (Dell, HP, Lenovo...) hoặc do Hypervisor (VMware ESXi, Hyper-V, Proxmox, KVM) gán cố định cho máy ảo.
* **CPU Processor ID:** Mã định danh chip vi xử lý của máy chủ.
* **Hoàn toàn KHÔNG dùng địa chỉ MAC card mạng:** Khách hàng có thể thay đổi card mạng, đổi cổng LAN, cắm USB Ethernet, gắn thêm card Wi-Fi hoặc cấu hình Network Teaming/Bonding mà **không bao giờ bị lỗi hay mất bản quyền**.

---

## II. CÁC PHƯƠNG PHÁP LẤY MACHINE ID CỦA MÁY CHỦ

### 👉 PHƯƠNG PHÁP 1: LẤY QUA GIAO DIỆN WEB (KHUYÊN DÙNG — 1 CHẠM, KHÔNG CẦN GÕ LỆNH)
Đây là cách đơn giản và thuận tiện nhất, áp dụng cho mọi người dùng và quản trị viên:

1. **Bước 1:** Mở trình duyệt và truy cập vào trang **SIMPLY IT** (`http://<IP_Server>:3000` hoặc `http://<IP_Server>:3001`).
2. **Bước 2:** Đăng nhập với tài khoản Quản trị viên (Admin) ➔ Truy cập menu **Cài Đặt** ➔ Chọn tab **Bản Quyền & Phiên Bản** (hoặc click icon chiếc khiên/hỗ trợ ở góc trang).
3. **Bước 3:** Quan sát ô **"Mã Máy Chủ (Machine ID)"**:
   * Mã định danh máy chủ hiển thị sẵn tại đây (VD: `SIMPLY-HW-FE18-E40A-551A-E2F0`).
4. **Bước 4:** Nhấn nút **[Sao chép] (Copy)**.
5. **Bước 5:** Gửi mã này cho đội ngũ kỹ thuật SIMPLY IT qua Zalo hoặc Email để nhận file bản quyền `.lic`.

---

### 👉 PHƯƠNG PHÁP 2: LẤY QUA DÒNG LỆNH CURL API (NHANH & CHÍNH XÁC NHẤT KHI DÙNG TERMINAL)
Nếu bạn đang SSH vào máy chủ Linux hoặc quản lý Docker container, đây là cách nhanh nhất chỉ bằng 1 câu lệnh:

#### 1. Chạy trực tiếp từ máy Host Linux / Ubuntu Server:
```bash
curl -s http://localhost:3000/api/license | grep -o '"currentMachineId":"[^"]*"'
```
*(Nếu hệ thống chạy cổng 3001, thay `3000` bằng `3001`)*.

#### 2. Chạy thông qua Docker Container:
*(Lưu ý: Tên container mặc định của SIMPLY IT là **`itsm-web-app`**)*:
```bash
docker exec -it itsm-web-app curl -s http://localhost:3000/api/license
```

---

### 👉 PHƯƠNG PHÁP 3: CHẠY TRỰC TIẾP QUA LỆNH NODE.JS / POWERSHELL (KHI CHƯA KHỞI ĐỘNG WEB)
Áp dụng khi máy chủ chưa khởi động container hoặc chưa có dịch vụ web:

#### 1. Trên hệ điều hành Linux (Ubuntu, Debian, CentOS, RHEL):
Sao chép và dán toàn bộ đoạn mã sau vào Terminal SSH:
```bash
node -e "
const crypto = require('crypto');
const fs = require('fs');
let uuid = '';
try { uuid = fs.readFileSync('/sys/class/dmi/id/product_uuid', 'utf8').trim(); } catch {}
if (!uuid) { try { uuid = fs.readFileSync('/etc/machine-id', 'utf8').trim(); } catch {} }
if (!uuid) { try { uuid = fs.readFileSync('/var/lib/dbus/machine-id', 'utf8').trim(); } catch {} }
let cpu = '';
try {
  const info = fs.readFileSync('/proc/cpuinfo', 'utf8');
  const m = info.match(/model name\s*:\s*(.+)/) || info.match(/Hardware\s*:\s*(.+)/);
  if (m) cpu = m[1].trim();
} catch {}
const raw = (uuid || 'LINUX_SERVER') + '::' + (cpu || 'LINUX_CPU');
const hash = crypto.createHash('sha256').update(raw).digest('hex').toUpperCase();
console.log('MÃ MACHINE ID: SIMPLY-HW-' + [hash.slice(0,4), hash.slice(4,8), hash.slice(8,12), hash.slice(12,16)].join('-'));
"
```

#### 2. Trên hệ điều hành Windows (PowerShell):
Mở PowerShell và thực thi lệnh sau:
```powershell
powershell -Command "$u=(Get-CimInstance Win32_ComputerSystemProduct).UUID; $c=((Get-CimInstance Win32_Processor)|Select-Object -First 1).ProcessorId; $raw=$u+'::'+$c; $hash=[BitConverter]::ToString([Security.Cryptography.SHA256]::Create().ComputeHash([Text.Encoding]::UTF8.GetBytes($raw))).Replace('-',''); Write-Output ('MÃ MACHINE ID: SIMPLY-HW-'+$hash.Substring(0,4)+'-'+$hash.Substring(4,4)+'-'+$hash.Substring(8,4)+'-'+$hash.Substring(12,4))"
```

---

### ⚠️ LƯU Ý CÁC LỖI THƯỜNG GẶP KHI CHẠY LỆNH TERMINAL

| Lỗi gặp phải | Nguyên nhân | Cách khắc phục |
| :--- | :--- | :--- |
| **`SyntaxError: Unexpected token ':'`** | Lệnh `node -e` gọi trực tiếp file TypeScript (`.ts`). Node.js mặc định không chạy được file TypeScript thuần. | Dùng **Phương pháp 1** (Xem trên web), **Phương pháp 2** (qua curl API), hoặc dùng đoạn script JS chuẩn ở **Phương pháp 3**. |
| **`No such container: simply-it-app`** | Tên container gõ sai. Trong file docker-compose, container dịch vụ chính có tên là **`itsm-web-app`**. | Đổi tên container thành `itsm-web-app`: <br>`docker exec -it itsm-web-app ...` |
| **`Connection refused` khi curl** | Web app chưa khởi động xong hoặc chạy cổng khác. | Kiểm tra `docker ps` để xem container đang chạy và kiểm tra cổng port (3000 hoặc 3001). |

---

## III. HƯỚNG DẪN KÍCH HOẠT BẢN QUYỀN SAU KHI NHẬN FILE .LIC

Sau khi gửi Machine ID, bạn sẽ nhận được tập tin bản quyền định dạng chứng thư số:
* Tên tập tin: `simply_it_license_<TenDonVi>.lic`
* Nội dung chứa chứng thư số RSA 2048-bit và khối khóa bản quyền `-----BEGIN SIMPLY IT ENTERPRISE LICENSE KEY-----`.

### 🌟 Cách 1: Kéo & Thả Tập Tin .lic (Kích hoạt 1-Click — Khuyên dùng)
1. Đăng nhập vào SIMPLY IT với quyền Quản trị viên (Admin).
2. Vào mục **Cài Đặt** ➔ Chọn tab **Bản Quyền & Phiên Bản**.
3. Tại khung **"Kéo & thả tập tin bản quyền (.lic) vào đây"**, bạn chỉ cần:
   * **Kéo thả trực tiếp file `.lic`** từ máy tính vào khung.
   * Hoặc bấm vào khung và chọn file `.lic` từ máy tính của bạn.
4. Hệ thống sẽ **tự động thẩm định chữ ký số và kích hoạt ngay tức thì trong 1 giây**.

### 🌟 Cách 2: Dán Khối Chứng Thư Hoặc Mã Bản Quyền Thủ Công
1. Mở file `.lic` bằng Notepad hoặc Text Editor.
2. Sao chép toàn bộ khối mã bản quyền hoặc khối chứng thư `-----BEGIN SIMPLY IT ENTERPRISE LICENSE KEY-----`.
3. Dán vào ô **Mã Bản Quyền (License Key)** tại trang Cài đặt.
4. Nhấn nút **Kích Hoạt Bản Quyền (Activate Enterprise Edition)**.

### Kết quả sau khi kích hoạt thành công:
* Thông báo thành công: **"Kích hoạt bản quyền Enterprise thành công!"**.
* Badge trạng thái chuyển sang: **👑 ENTERPRISE EDITION**.
* Trạng thái khóa máy chủ: **🔒 Đã khóa theo máy chủ này** (Khớp chính xác với Machine ID của server).
* Thời hạn bản quyền hiển thị: **Vĩnh viễn** *(hoặc số ngày tương ứng theo hợp đồng)*.
* Toàn bộ 9 phân hệ doanh nghiệp nâng cao (SSO M365, Active Directory, Webhooks, Phân tuyến SLA, Gemini AI & OCR, Quét hạn Telegram, Kiểm kê Tài sản, Scan Thiết bị & Mạng, Sơ đồ Mặt bằng 2D) sẽ được mở khóa 100%.

---

## IV. QUY TRÌNH HỖ TRỢ ĐỔI MÁY CHỦ KHI GẶP SỰ CỐ PHẦN CỨNG

Khách hàng mua bản quyền SIMPLY IT hoàn toàn yên tâm khi vận hành dài hạn:

1. **Khi nào cần cấp đổi Machine ID?**
   * Máy chủ vật lý bị hỏng Bo Mạch Chủ (Mainboard) hoặc thay thế chip CPU chính.
   * Đơn vị nâng cấp, chuyển đổi toàn bộ hệ thống sang máy chủ vật lý mới hoặc cụm máy ảo mới.
2. **Quy trình thực hiện:**
   * **Bước 1:** Cài đặt SIMPLY IT lên máy chủ mới theo tài liệu hướng dẫn triển khai.
   * **Bước 2:** Lấy mã **Machine ID mới** của máy chủ đó theo Phần II ở trên.
   * **Bước 3:** Gửi mã Machine ID mới cho Bộ phận Chăm sóc Khách hàng SIMPLY IT.
   * **Bước 4:** Quản trị viên SIMPLY IT sẽ sử dụng công cụ **License Studio** ➔ Chọn tính năng **"✏️ Đổi Máy"** trên bản ghi của quý khách ➔ Dán Machine ID mới và ký lại file `.lic` mới.
   * **Bước 5:** Quý khách tải file `.lic` mới kéo thả vào hệ thống trên máy mới để tiếp tục sử dụng bình thường. Toàn bộ thời hạn và quyền lợi bản quyền được bảo lưu trọn vẹn 100%.

---
**TRUNG TÂM PHÁT TRIỂN & HỖ TRỢ KỸ THUẬT SIMPLY IT**  
*Hotline / Zalo Hỗ Trợ:* Liên hệ Quản trị viên phụ trách  
*Email:* support@simply-it.vn  
*Phiên bản tài liệu:* 2.1 (Cập nhật tháng 09/2026)
