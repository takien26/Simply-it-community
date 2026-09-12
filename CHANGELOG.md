# 📋 NHẬT KÝ CẬP NHẬT PHIÊN BẢN (CHANGELOG)

## [v1.0.1] - 12/09/2026

Bản cập nhật **v1.0.1** tập trung nâng cấp trải nghiệm người dùng, bổ sung quản lý vòng đời nhân sự (nghỉ việc), tăng cường bảo mật đăng nhập, nâng cấp khả năng tương tác bảng dữ liệu và khắc phục triệt để các lỗi cấu hình gửi email SMTP.

---

### 🌟 1. Tính Năng Mới & Nâng Cấp Nghiệp Vụ

#### A. Quản Lý Nhân Sự Nghỉ Việc & Chặn Đăng Nhập Tuyệt Đối
- **Phân loại trạng thái công tác**:
  - Thêm tab chuyên biệt `🛑 Nghỉ việc` trên trang Quản lý Người Dùng (`/users`).
  - Hiển thị badge trạng thái rõ nét: `🟢 Đang làm việc` vs `🛑 Đã nghỉ việc` trên bảng dữ liệu và modal chi tiết.
- **Chặn đăng nhập 3 lớp bảo mật**:
  - **Mật khẩu nội bộ**: Khi tài khoản có trạng thái Nghỉ việc (`isActive = false`), hệ thống lập tức từ chối đăng nhập (HTTP 403) kèm thông báo: *"Tài khoản của bạn đã nghỉ việc hoặc bị khóa. Không thể đăng nhập vào hệ thống."*
  - **Microsoft 365 SSO**: Nhận diện thuộc tính `accountEnabled` qua Microsoft Graph API. Khi tài khoản trên Entra ID bị khóa, tự động chuyển trạng thái sang Nghỉ việc và từ chối cấp phiên đăng nhập.
  - **Active Directory / LDAP**: Nhận diện cờ khóa tài khoản (`userAccountControl & 2`) từ máy chủ Domain Controller, chặn đăng nhập an toàn.
- **Thu hồi tài sản tự động**:
  - Khi quản trị viên chuyển nhân sự sang Nghỉ việc, hệ thống cung cấp tùy chọn: *"Tự động thu hồi toàn bộ thiết bị & license về kho"*, đưa máy tính về trạng thái `AVAILABLE` và giải phóng bản quyền phần mềm ngay lập tức.
- **Khôi phục công tác (`Reactivate`)**: Cho phép đưa nhân sự quay lại làm việc và mở khóa tài khoản chỉ với 1 click.

#### B. Đồng Bộ Thư Mục Tự Động (Directory Sync)
- **API `POST /api/users/sync-directory`**: Tự động kết nối với Microsoft Graph (M365) và máy chủ LDAP/AD để quét danh sách nhân viên.
- **Tự động xử lý**: Nếu tài khoản bị vô hiệu hóa hoặc đã xóa khỏi thư mục công ty, Simply IT sẽ tự động chuyển tài khoản sang Nghỉ việc và ghi nhận Audit Log.
- **Nút bấm trực quan**: Bổ sung nút `🔄 Đồng Bộ Thư Mục` trực tiếp trên thanh công cụ trang Người Dùng.

#### C. Menu Chuột Phải Thao Tác Nhanh (Right-Click Context Menu)
- **Kích hoạt tự nhiên**: Khi nhấp chuột phải vào bất kỳ hàng nào trên bảng danh sách tài sản (`/assets`), mở ngay menu thao tác nổi tại vị trí con trỏ chuột.
- **Đầy đủ 8 thao tác chính**:
  1. 👁️ **Xem chi tiết thiết bị** (`Detail Modal`)
  2. ✏️ **Chỉnh sửa thông số** (`Edit Modal`)
  3. 🤝 **Cấp phát & điều chuyển** (`Transfer Modal`)
  4. 📄 **In biên bản bàn giao PDF** (`Handover PDF`)
  5. 🖨️ **In mã QR & tem nhãn** (`QR Print`)
  6. 🔧 **Bảo trì / Sửa chữa** (`Maintenance Modal`)
  7. 📋 **Sao chép mã tài sản** (`Copy Tag to Clipboard`)
  8. 🗑️ **Xóa thiết bị này** (`Delete with confirm`)
- **Tối ưu hiển thị**: Tự động căn chỉnh toạ độ trong phạm vi màn hình (`viewport bounds`), không bị tràn mép. Tự động đóng khi click ra ngoài, cuộn trang hoặc bấm `Escape`.

#### D. Kéo Thả Khung Chat AI Linh Hoạt (Draggable Floating Chat)
- **Không che khuất dữ liệu**:
  - Người dùng có thể nhấn giữ chuột (hoặc chạm tay trên màn hình cảm ứng) vào nút tròn AI và kéo đi bất kỳ đâu trên màn hình để tránh che khuất các nút thao tác hoặc cột dữ liệu.
  - Khi mở rộng khung chat (410x550px), thanh tiêu đề (header) đóng vai trò tay cầm kéo (`cursor-grab` / `⠿ Kéo để di chuyển`), cho phép vừa di chuyển khung chat vừa đọc dữ liệu bên dưới.
- **Phân biệt Click & Drag**: Nhấp chuột nhanh (< 4px) mở chat; nhấn giữ kéo (> 4px) di chuyển vị trí.
- **Nút "Gốc"**: Bấm để đưa khung chat về vị trí góc dưới phải mặc định.
- **Ghi nhớ vị trí**: Tự động lưu vị trí kéo vào `localStorage` (`simply:chat-pos`), giữ nguyên vị trí khi chuyển trang hoặc F5.

#### E. Tối Ưu Form Thêm & Sửa Thiết Bị (`/assets`)
- **Tự động điền ngày mua**: Form thêm tài sản tự động điền ngày mua mặc định là ngày hiện tại (`hôm nay`).
- **Chọn nhanh thời hạn bảo hành**: Bổ sung 4 nút chọn nhanh bảo hành: `1 năm (12T)`, `2 năm (24T)`, `3 năm (36T)`, `5 năm (60T)`. Tự động tính toán ngày hết hạn bảo hành dựa trên ngày mua.
- **Bổ sung trường ngày mua / ngày nhập hàng**: Hiển thị rõ ràng trường ngày mua trên form nhập liệu và bảng danh sách.

---

### 🐛 2. Sửa Lỗi Hệ Thống (Bug Fixes)

#### A. Sửa Lỗi Lưu Cấu Hình SMTP Bị Mất Khi F5
- **Nguyên nhân**: API `GET /api/settings` trả về `{ success: true, data: settings }`, nhưng frontend lại kiểm tra `dataSettings.settings` (undefined), dẫn đến việc mỗi khi F5 trang, dữ liệu không được nạp vào form và bị xóa trắng.
- **Khắc phục**:
  - API `GET /api/settings` trả về cả `data` lẫn `settings` để tương thích toàn diện.
  - Frontend `email-settings-tab.tsx` đọc an toàn từ `dataSettings.data || dataSettings.settings`. Khi F5, cấu hình đã lưu luôn hiển thị đầy đủ.

#### B. Sửa Lỗi Gửi Thử Email Báo `connect ECONNREFUSED 127.0.0.1`
- **Nguyên nhân**:
  - Nút test email gửi thiếu thông tin host/port từ form, khiến `host` bị undefined.
  - Khi host rỗng, thư viện `nodemailer` mặc định trỏ về `localhost` (`127.0.0.1:587`), gây lỗi kết nối bị từ chối `ECONNREFUSED 127.0.0.1`.
- **Khắc phục**:
  - API `/api/email/test` tự động fallback về cấu hình đã lưu trong cơ sở dữ liệu nếu form không truyền lên.
  - Bắt buộc kiểm tra `host`: nếu Host trống, hệ thống từ chối và hiển thị thông báo hướng dẫn rõ ràng, không để nodemailer tự kết nối vào `127.0.0.1`.
  - Frontend truyền đầy đủ cấu hình đang nhập để kiểm tra trực tiếp.
  - Đồng bộ hóa các tên khóa cài đặt: `email.smtp_from_name` / `email.from_name`, `email.smtp_from_email` / `email.from_email`, `email.smtp_enabled` / `email.enabled`.
  - Thông báo lỗi mạng chi tiết, trực quan bằng tiếng Việt cho các trường hợp: sai Host/Port, chặn firewall, sai mật khẩu ứng dụng.

---

### 📦 3. Danh Sách Tập Tin Thay Đổi

- `package.json`: Nâng phiên bản từ `1.0.0` lên `1.0.1`.
- `src/components/layout/header.tsx`: Cập nhật hiển thị phiên bản `v1.0.1` trong modal About và Kỹ thuật.
- `src/components/settings/license-settings-tab.tsx`: Cập nhật hiển thị `v1.0.1`.
- `src/components/common/LicenseActivationModal.tsx`: Cập nhật hiển thị `v1.0.1`.
- `src/app/api/system/backup/download/route.ts`: Cập nhật phiên bản manifest backup `1.0.1`.
- `src/app/(dashboard)/assets/page.tsx`: Menu chuột phải context menu, tự động điền ngày mua, chọn nhanh hạn bảo hành.
- `src/components/chatbot/ChatWidget.tsx`: Kéo thả linh hoạt nút chat và khung chat AI.
- `src/app/(dashboard)/users/page.tsx`: Tab Nghỉ việc, hiển thị trạng thái, thu hồi tài sản, đồng bộ thư mục.
- `src/app/api/settings/route.ts`: Chuẩn hóa dữ liệu trả về `data` và `settings`.
- `src/components/settings/email-settings-tab.tsx`: Khắc phục nạp cấu hình khi F5 và truyền tham số test SMTP.
- `src/lib/email.ts`: Hỗ trợ đa dạng key SMTP, fallback an toàn, chẩn đoán lỗi tiếng Việt.
- `src/app/api/email/test/route.ts`: Hỗ trợ test linh hoạt theo form và theo database.
- `CHANGELOG.md`: Tài liệu ghi chú chi tiết bản cập nhật v1.0.1.

---

### 🚀 4. Hướng Dẫn Nâng Cấp Lên v1.0.1

1. **Kéo mã nguồn mới nhất từ GitHub**:
   ```bash
   git pull origin main
   ```
2. **Cập nhật database schema (nếu có)**:
   ```bash
   npx prisma generate
   ```
3. **Biên dịch và khởi động lại dịch vụ**:
   ```bash
   npm run build
   npm start
   ```
   *(Hoặc khởi động lại qua ứng dụng Launcher `SimplyIT_Server.exe`)*
