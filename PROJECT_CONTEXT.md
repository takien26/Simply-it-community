# 🧠 BỐI CẢNH DỰ ÁN & TIẾN ĐỘ PHÁT TRIỂN (PROJECT CONTEXT & MEMORY)

> **Mục đích**: File này lưu trữ toàn bộ ngữ cảnh trao đổi, kiến trúc hệ thống, lịch sử công việc và quy ước phát triển của dự án **Simply IT**. Khi chuyển sang máy tính khác hoặc mở phiên làm việc mới, AI Agent chỉ cần đọc file này là hiểu ngay 100% bối cảnh và tiếp tục công việc liền mạch mà không cần giải thích lại từ đầu.

---

## 📌 1. Tổng Quan Dự Án & Công Nghệ

- **Tên dự án**: **Simply IT** (Hệ thống Quản lý Tài sản CNTT & Dịch vụ IT Doanh nghiệp - IT Asset & Service Management).
- **Mã nguồn trên GitHub**:
  - Repo 1 (Community): `https://github.com/takien26/Simply-it-community.git`
  - Repo 2 (Mirror): `https://github.com/takien26/Simply-IT.git`
  - **Quy ước đồng bộ**: Bất kỳ thay đổi nào cũng phải đồng bộ và push lên cả 2 repository trên!
- **Công nghệ nền tảng (Tech Stack)**:
  - **Framework**: Next.js 15 (App Router, Server Actions, Dynamic API Routes)
  - **Frontend**: React 19, Tailwind CSS, Lucide Icons, Radix UI, Framer Motion
  - **Database & ORM**: Prisma ORM, SQLite (hoặc PostgreSQL cho bản doanh nghiệp)
  - **Agent thu thập phần cứng**: PowerShell 5.1+ (`public/scripts/get_system_info.ps1` & `simply-it-collector.ps1`), WMI/CIM, tương thích Windows 10/11 & GPO/Domain.
  - **Đóng gói ứng dụng**: Electron / C# Launcher (`SimplyIT_Server.exe`, `SimplyIT_Community_Launcher.cs`).

---

## 🎯 2. Trạng Thái Hiện Tại (Phiên bản v1.0.1 - Cập nhật ngày 12/09/2026)

Hệ thống vừa hoàn thành nâng cấp lớn từ v1.0.0 lên **v1.0.1** với các module cốt lõi sau:

### A. Quản lý Vòng Đời Nhân Sự & Chặn Đăng Nhập Nghỉ Việc
- Thêm tab `🛑 Nghỉ việc` trên trang Người dùng (`/users`).
- **Chặn đăng nhập 3 lớp**:
  - Mật khẩu nội bộ: từ chối 403 nếu `isActive = false`.
  - Microsoft 365 SSO: nhận diện `accountEnabled = false` qua Graph API.
  - Active Directory / LDAP: kiểm tra `userAccountControl & 2`.
- **Tự động thu hồi tài sản**: Tùy chọn thu hồi toàn bộ thiết bị và license về kho khi nhân viên nghỉ việc.
- **Directory Sync**: Nút bấm và API `POST /api/users/sync-directory` đồng bộ trạng thái nhân sự từ M365/AD.

### B. Menu Chuột Phải Thao Tác Nhanh (Context Menu)
- Nhấp chuột phải vào bất kỳ hàng nào trên bảng tài sản (`/assets`) sẽ mở ngay menu nổi với 8 thao tác: Xem chi tiết, Chỉnh sửa, Điều chuyển, In PDF bàn giao, In tem QR, Bảo trì, Copy mã, Xóa.
- Tự động giới hạn toạ độ trong màn hình, tự đóng khi click ra ngoài/cuộn/Escape.

### C. Khung Chat AI Nổi Kéo Thả (Draggable Floating Chat)
- Cho phép người dùng nhấn giữ kéo nút chat AI và khung hội thoại đi bất kỳ vị trí nào trên màn hình để không che khuất dữ liệu bên dưới.
- Tự động lưu toạ độ vào `localStorage` (`simply:chat-pos`), phân biệt click và drag (> 4px).

### D. Khắc phục triệt để lỗi Cấu hình SMTP
- **Sửa lỗi mất thông tin khi F5**: Do API trả về `{ success: true, data: settings }` trong khi frontend đọc `dataSettings.settings`. Đã đồng bộ chuẩn cả hai trường.
- **Sửa lỗi `connect ECONNREFUSED 127.0.0.1`**: Nút "Gửi thư thử nghiệm" hiện truyền đầy đủ host/port/user từ form lên API, phân loại lỗi tiếng Việt rõ ràng, ngăn chặn `nodemailer` tự fallback về localhost.

### E. Tự động Nhận diện & Cập nhật Danh mục Thiết bị (Laptop / Desktop / Server)
- **Agent thu thập**: Kiểm tra `Win32_Battery` (nếu có pin -> Laptop) và `Win32_SystemEnclosure.ChassisTypes` (8..14, 30..32 -> Laptop; 17, 23, 28, 29 -> Server).
- **Backend API (`/api/v1/auto-scan/collect` & `/api/auto-scan/collect`)**:
  - Sử dụng module `src/lib/device-detection.ts` nhận diện đa tầng (pin, chassis, model Lenovo `21S6...`, `ThinkPad`, `Latitude`...).
  - Gán chuẩn danh mục `Laptop` / `PC / Máy tính để bàn` / `Máy chủ`.
  - **Cập nhật cả thiết bị cũ**: Khi máy quét lại, nếu danh mục trước đó là chung chung (`Thiết bị văn phòng`, `Khác`, trống), hệ thống tự động đổi sang đúng danh mục thực tế (`Laptop`).

### F. Hệ thống Tiếp nhận Ticket Qua Email (Inbound Email-to-Ticket & Auto-Routing)
Chuẩn hoá theo mô hình ITSM doanh nghiệp lớn (ServiceNow, Jira Service Management, Zendesk):
- **Giao thức Ingestion (IMAP / SSL)**: Tương thích hoàn toàn với Gmail, Microsoft 365, Zimbra, Exchange, mail server riêng (`imapflow` + `mailparser`).
- **Phân tách & Tối ưu Nội dung**: Bóc tách tự động Header, Subject, Text/Clean HTML và lưu trữ toàn bộ file đính kèm/ảnh chụp màn hình đính kèm vào `public/uploads/tickets/email/`.
- **Tự động định danh Người gửi (Requester Resolution)**: Khớp email người gửi với User trong hệ thống; nếu là người dùng mới, tự động khởi tạo tài khoản cơ bản với role `EMPLOYEE`.
- **Hội thoại thông minh (Conversation Threading)**: Nhận diện mã ticket `[TK-2026-xxxx]` hoặc `[#TIC-xxxx]` trong tiêu đề/References/In-Reply-To để chuyển tiếp vào Ticket hiện hữu dưới dạng trao đổi bình luận (Comment), đồng thời tự động kích hoạt mở lại ticket nếu đang ở trạng thái `WAITING` hoặc `RESOLVED`.
- **Chống Lặp Vô Tận & Lọc Thư Tự Động (Anti-Loop & Anti-Spam)**: Kiểm tra chuẩn RFC 3834 (`Auto-Submitted`, `X-Auto-Response-Suppress`), bỏ qua email Out of Office, Mail Delivery System, và chặn gửi thông báo ngược lại chính hộp thư ticket.
- **Tích hợp Tự động Điều phối (Routing Engine)**: Gọi trực tiếp `routeTicket(ticket.id)` để tự động gán Nhóm IT chuyên trách, Hàng đợi (Queue) và Kỹ thuật viên (Technician) phù hợp theo phân loại và SLA.
- **Thư xác nhận tự động (Auto-responder)**: Phản hồi tức thì email kèm mã Ticket tiếp nhận và cam kết thời gian SLA giải quyết.
- **Quản trị & Giám sát Trực quan**: Giao diện Cài đặt Email chia 3 phân hệ: `Gửi Thư Tự Động (SMTP)`, `Tiếp Nhận Ticket Qua Email (IMAP)`, và `Mẫu Email Thông Báo`. Hỗ trợ nút "Sao chép từ SMTP", "Kiểm Tra Kết Nối", "Quét Hộp Thư Ngay (Sync Now)", cùng bảng nhật ký đồng bộ chi tiết.
- **Worker chạy nền**: Tự động kích hoạt quét hộp thư ngầm mỗi 2 phút trong `server.js` (`/api/cron/email-inbound?run=true`).

---

## 📂 3. Cấu Trúc Thư Mục & Các File Trọng Tâm

```text
Simply-it-community/
├── public/scripts/
│   ├── get_system_info.ps1         # Script PowerShell thu thập phần cứng & phần mềm máy trạm
│   └── simply-it-collector.ps1     # Bản sao đồng bộ của script thu thập
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auto-scan/collect/  # API nhận dữ liệu từ script thu thập
│   │   │   ├── v1/auto-scan/       # API v1 chuẩn hoá thu thập dữ liệu
│   │   │   ├── settings/           # API đọc/ghi cài đặt hệ thống (SMTP, chung)
│   │   │   ├── email/test/         # API kiểm tra kết nối SMTP
│   │   │   └── users/sync-directory # API đồng bộ nhân sự M365/AD
│   │   ├── assets/                 # Trang Quản lý tài sản (bảng, filter, context menu)
│   │   ├── users/                  # Trang Quản lý người dùng (tab Đang làm việc / Nghỉ việc)
│   │   └── settings/               # Trang Cấu hình hệ thống (Tab Email, LDAP, Tổ chức)
│   ├── components/
│   │   ├── chat/
│   │   │   └── DraggableFloatingChat.tsx # Widget chat AI kéo thả nổi
│   │   └── settings/
│   │       └── email-settings-tab.tsx    # Giao diện cấu hình SMTP
│   ├── lib/
│   │   ├── db.ts                   # Khởi tạo Prisma Client
│   │   ├── email.ts                # Gửi email & kiểm tra kết nối SMTP
│   │   ├── device-detection.ts     # Nhận diện chủng loại thiết bị & map category
│   │   ├── license-reconciliation.ts # Đối soát phần mềm quét được với License kho
│   │   └── auth.ts                 # Xác thực người dùng, chặn tài khoản nghỉ việc
│   └── types/                      # TypeScript definitions
├── prisma/
│   └── schema.prisma               # Schema cơ sở dữ liệu (Asset, User, Category, License...)
├── CHANGELOG.md                    # Lịch sử thay đổi chi tiết từng phiên bản
└── PROJECT_CONTEXT.md              # Bối cảnh dự án này
```

---

## ⚡ 4. Hướng Dẫn Bắt Đầu Nhanh Khi Chuyển Sang Máy Tính Mới

Khi bạn mở dự án trên máy tính mới hoặc mở một cửa sổ chat AI mới, bạn chỉ cần gửi câu lệnh ngắn gọn:

> **"Hãy đọc file `PROJECT_CONTEXT.md` và `AGENTS.md` để tiếp tục công việc của dự án Simply IT."**

AI sẽ ngay lập tức:
1. Đọc toàn bộ kiến trúc và các tính năng vừa thực hiện.
2. Nắm rõ quy tắc kiểm tra `npm run build` trước khi hoàn tất.
3. Luôn đồng bộ mã nguồn sang cả 2 repository (`Simply-it-community` và `Simply IT`).
4. Tuân theo nguyên tắc phát triển tối giản, hiệu quả (Lazy Senior Dev / Ponytail rule).
