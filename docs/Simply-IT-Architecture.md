# Simply IT Community Edition (CE) v1.0.4
## Tài Liệu Kiến Trúc Hệ Thống & Nền Tảng Công Nghệ

**Phiên bản:** 1.0.4  
**Giấy phép:** Apache-2.0 (Mã nguồn mở)  
**Ngày cập nhật:** 20/09/2026

---

## 1. Tổng Quan Hệ Thống

**Simply IT Community Edition** là hệ thống quản lý tài sản CNTT (IT Asset Management – ITAM) và Helpdesk mã nguồn mở, được xây dựng trên nền tảng web hiện đại. Hệ thống cung cấp giải pháp toàn diện cho việc:

- Quản lý tài sản CNTT (phần cứng, phần mềm, giấy phép)
- Hệ thống Helpdesk & Ticket hỗ trợ kỹ thuật
- Quản lý sự cố (Incident Management)
- Quản lý bảo trì tài sản định kỳ
- Quản lý mật khẩu tập trung (Password Vault)
- Quản lý tài liệu & hồ sơ
- Quản lý linh kiện thay thế (Spare Parts)
- Tích hợp AI (Google Gemini)
- Portal tự phục vụ cho người dùng cuối
- Agent tự động quét tài sản trên mạng

---

## 2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────────────┐
│                    Simply IT Community Edition                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web Browser  │  │  Electron    │  │  Mobile (HTTPS/QR)   │  │
│  │  (Desktop)    │  │  Desktop App │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│  ═══════╪═════════════════╪══════════════════════╪══════════    │
│         │                 │                      │              │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │              Custom Node.js Server (server.js)            │  │
│  │         HTTP (:3001)  +  HTTPS (:3443, Self-signed)       │  │
│  ├───────────────────────────────────────────────────────────┤  │
│  │                 Next.js 15.1 (App Router)                 │  │
│  │  ┌─────────────────────┐  ┌─────────────────────────────┐│  │
│  │  │   React 19 Frontend │  │   API Routes (51 modules)   ││  │
│  │  │   - Radix UI        │  │   - RESTful API             ││  │
│  │  │   - Tailwind CSS    │  │   - JWT Authentication      ││  │
│  │  │   - Recharts        │  │   - Zod Validation          ││  │
│  │  │   - TanStack Table  │  │   - File Upload (busboy)    ││  │
│  │  └─────────────────────┘  └──────────┬──────────────────┘│  │
│  └──────────────────────────────────────┤                    │  │
│                                         │                    │  │
│  ┌──────────────────────────────────────▼──────────────────┐ │  │
│  │                  Prisma ORM (v6.x)                      │ │  │
│  │              TypeScript Schema + Migrations             │ │  │
│  └──────────────────────────┬──────────────────────────────┘ │  │
│                              │                                │  │
│  ┌───────────────────────────▼─────────────────────────────┐  │  │
│  │              PostgreSQL 16 (Alpine)                     │  │  │
│  │         Persistent Volume: itsm_postgres_data           │  │  │
│  └─────────────────────────────────────────────────────────┘  │  │
│                                                                │  │
│  ┌─────────────────────────────────────────────────────────┐  │  │
│  │             Background Automation Engines               │  │  │
│  │  🔔 Alert Scanner (mỗi 1h, 1 lần/ngày)                │  │  │
│  │  📧 Email-to-Ticket Poller (mỗi 2 phút)               │  │  │
│  │  ⏱️ Ticket Auto-Close (mỗi 6h)                         │  │  │
│  │  📅 Recurring Maintenance (mỗi 12h)                    │  │  │
│  └─────────────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Nền Tảng Công Nghệ (Tech Stack)

### 3.1 Backend

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Node.js** | 22 (Alpine) | Runtime chạy server |
| **Next.js** | 15.1 | Framework fullstack (App Router) |
| **TypeScript** | 5.7 | Ngôn ngữ lập trình chính |
| **Prisma** | 6.x | ORM kết nối CSDL, migration, type-safe queries |
| **PostgreSQL** | 16 (Alpine) | Cơ sở dữ liệu quan hệ chính |

### 3.2 Frontend

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **React** | 19 | Thư viện UI (Server & Client Components) |
| **Radix UI** | Mới nhất | Bộ component accessible (Dialog, Select, Toast, Tabs...) |
| **Tailwind CSS** | 3.4 | Utility-first CSS framework |
| **TanStack Table** | 8.20 | Bảng dữ liệu nâng cao (sort, filter, pagination) |
| **Recharts** | 2.15 | Biểu đồ thống kê Dashboard |
| **Lucide React** | 0.468 | Bộ icon SVG |
| **next-themes** | 0.4 | Hỗ trợ Dark/Light mode |

### 3.3 State Management & Data Fetching

| Công nghệ | Vai trò |
|-----------|---------|
| **SWR** (2.5) | Data fetching với cache, revalidation, real-time sync |
| **Zustand** (5.0) | Global state management nhẹ |
| **react-hook-form** (7.54) | Quản lý form hiệu suất cao |
| **Zod** (3.24) | Schema validation cho form & API |

### 3.4 Bảo Mật (Security)

| Công nghệ | Vai trò |
|-----------|---------|
| **jose** (5.9) | JWT token tạo & xác thực |
| **argon2** (0.45) | Băm mật khẩu cấp độ quân sự (primary) |
| **bcryptjs** (2.4) | Băm mật khẩu (fallback) |
| **selfsigned** (5.5) | Tự tạo chứng chỉ SSL cho HTTPS |
| **kdbxweb** (2.1) | Quản lý vault mật khẩu (KeePass format) |

### 3.5 Xử Lý File & Tài Liệu

| Công nghệ | Vai trò |
|-----------|---------|
| **busboy** (1.6) | Upload file multipart/form-data |
| **exceljs** (4.4) | Xuất/nhập file Excel (.xlsx) |
| **docx** (9.7) | Tạo file Word (.docx) |
| **mammoth** (1.12) | Đọc file Word (.docx) |
| **pdfjs-dist** (3.11) | Đọc file PDF |
| **archiver** (8.0) | Nén file ZIP |
| **react-dropzone** (14.3) | Kéo thả upload file |

### 3.6 Email

| Công nghệ | Vai trò |
|-----------|---------|
| **nodemailer** (9.0) | Gửi email (SMTP outbound) |
| **imapflow** (2.0) | Nhận email (IMAP inbound) |
| **mailparser** (3.9) | Phân tích nội dung email |

### 3.7 QR Code & Barcode

| Công nghệ | Vai trò |
|-----------|---------|
| **html5-qrcode** (2.3) | Quét QR/barcode bằng camera |
| **qrcode** (1.5) | Tạo mã QR cho tài sản |

### 3.8 AI & Tích Hợp

| Công nghệ | Vai trò |
|-----------|---------|
| **@google/generative-ai** (0.24) | Tích hợp Google Gemini AI (chatbot, phân tích) |

### 3.9 Desktop

| Công nghệ | Phiên bản | Vai trò |
|-----------|-----------|---------|
| **Electron** | 43.4 | Đóng gói ứng dụng desktop (Windows/Mac/Linux) |

---

## 4. Cách Hệ Thống Chạy

### 4.1 Custom Server (server.js)

Hệ thống **không** dùng `next start` mặc định mà sử dụng **custom server** (`server.js`) với các tính năng:

1. **Dual Protocol:** Chạy đồng thời HTTP (port 3001) và HTTPS (port 3443)
2. **Auto SSL:** Tự động tạo chứng chỉ SSL self-signed khi lần đầu khởi động
3. **Static File Serving:** Phục vụ trực tiếp file uploads với cache 1 năm
4. **No-Cache Control:** Tự động gắn header no-cache cho HTML, API, RSC responses
5. **Memory Allocation:** `--max-old-space-size=4096` (4GB RAM cho Node.js)
6. **Auto-detect Mode:** Tự phát hiện DEVELOPMENT/PRODUCTION dựa trên `.next/BUILD_ID`
7. **Error Recovery:** Bắt uncaughtException & unhandledRejection để tránh crash

### 4.2 Background Automation Engines

Server tích hợp 4 engine chạy nền tự động, **không cần cron job bên ngoài**:

| Engine | Chu kỳ | Mô tả |
|--------|--------|-------|
| **🔔 Alert Scanner** | Mỗi 1h (1 lần/ngày) | Quét cảnh báo: tài sản hết bảo hành, giấy phép sắp hết hạn, bảo trì đến hạn |
| **📧 Email-to-Ticket** | Mỗi 2 phút | Đọc hòm thư IMAP, tự tạo ticket từ email gửi đến |
| **⏱️ Auto-Close** | Mỗi 6h | Tự đóng ticket đã resolved quá thời gian quy định |
| **📅 Maintenance** | Mỗi 12h | Tạo ticket bảo trì định kỳ theo lịch đã cấu hình |

### 4.3 Quy Trình Khởi Động

```
1. Kiểm tra .next/BUILD_ID → xác định DEV hoặc PRODUCTION
2. Tạo/đọc SSL certificate (.certificates/)
3. app.prepare() → khởi tạo Next.js
4. Khởi động HTTP Server (:3001)
5. Khởi động HTTPS Server (:3443)
6. Sau 30-75s → Kích hoạt 4 Background Engines
```

---

## 5. Các Phương Thức Triển Khai (Deployment)

### 5.1 Docker (Khuyến nghị cho Production)

```bash
# Khởi chạy toàn bộ stack (PostgreSQL + App)
docker-compose up -d

# Chỉ build lại app
docker-compose up -d --build app
```

**Docker Compose** bao gồm:
- **PostgreSQL 16 Alpine** với health check tự động
- **App container** (Node.js 22 Alpine) với multi-stage build
- Persistent volumes cho database (`itsm_postgres_data`) và uploads (`itsm_uploads_data`)
- Tự động chạy Prisma migration qua `docker-entrypoint.sh`

### 5.2 Bare Metal / VM

```bash
# 1. Cài đặt Node.js 22+ & PostgreSQL 16+
# 2. Clone và cài đặt
git clone https://github.com/takien26/Simply-it-community.git
cd Simply-it-community
npm install

# 3. Cấu hình .env
DATABASE_URL="postgresql://user:pass@localhost:5432/it_asset_db"
JWT_SECRET="your-secret-key"

# 4. Khởi tạo database
npx prisma migrate deploy
npx prisma db seed

# 5. Build và chạy
npm run build
npm start   # → node --max-old-space-size=4096 server.js
```

### 5.3 Electron Desktop App

```bash
npm run desktop   # → electron electron/main.js
```

Chạy như ứng dụng desktop native trên Windows, macOS, Linux. Server nhúng trong app, truy cập qua localhost.

### 5.4 Development Mode

```bash
npm run dev   # → next dev (hot-reload, on-demand compile)
```

---

## 6. Các Module Chức Năng

### 6.1 Dashboard (17 Module Frontend)

| # | Module | Mô tả |
|---|--------|-------|
| 1 | **Dashboard** | Tổng quan thống kê, biểu đồ tài sản & ticket |
| 2 | **Assets** | Quản lý tài sản CNTT (CRUD, gán, kiểm kê, audit) |
| 3 | **Tickets** | Helpdesk / yêu cầu hỗ trợ kỹ thuật |
| 4 | **Licenses** | Quản lý giấy phép phần mềm (seats, hạn sử dụng) |
| 5 | **Services** | Quản lý dịch vụ CNTT |
| 6 | **Spare Parts** | Quản lý linh kiện thay thế (xuất/nhập kho) |
| 7 | **Users** | Quản lý người dùng, phân quyền |
| 8 | **Categories** | Danh mục phân loại tài sản |
| 9 | **Passwords** | Vault mật khẩu (KeePass format) |
| 10 | **Documents** | Quản lý tài liệu đính kèm |
| 11 | **Incidents** | Quản lý sự cố (liên kết ticket) |
| 12 | **Approvals** | Quy trình duyệt yêu cầu |
| 13 | **Knowledge Base** | Cơ sở tri thức (KB) |
| 14 | **Floor Maps** | Bản đồ vị trí tài sản |
| 15 | **Portal** | Portal tự phục vụ cho người dùng cuối |
| 16 | **Discovery** | Khám phá & quét tài sản trên mạng |
| 17 | **Settings** | Cấu hình hệ thống |

### 6.2 API Backend (51 Module API)

Hệ thống cung cấp **51 module API RESTful**, bao gồm:

- **CRUD cơ bản:** assets, tickets, licenses, services, users, categories, documents, passwords, spare-parts, incidents, vendors, companies, locations, currencies
- **Nghiệp vụ nâng cao:** approvals, audit-campaigns, routing-rules, support-queues, support-teams, canned-responses, maintenance-schedules, projects, problems
- **Tự động hóa:** cron (alert-scanner, email-inbound, ticket-auto-close, maintenance), auto-scan, discovery, webhooks
- **AI & Tích hợp:** ai, chatbot, email, notifications, realtime
- **Import/Export:** import, export, upload, scan (QR/barcode)
- **Hệ thống:** auth, roles, permissions, settings, system, master-data, search, reports, scripts

---

## 7. Bảo Mật

### 7.1 Xác Thực (Authentication)
- **JWT Token** (jose) với thời hạn cấu hình (mặc định 7 ngày)
- **Argon2** – thuật toán băm mật khẩu mạnh nhất hiện nay (memory-hard)
- **bcryptjs** – fallback cho môi trường không hỗ trợ native argon2

### 7.2 Phân Quyền (Authorization)
- Hệ thống **RBAC** (Role-Based Access Control)
- Module `roles` & `permissions` quản lý quyền chi tiết
- Middleware kiểm tra quyền trên mỗi API route

### 7.3 Truyền Tải (Transport)
- HTTPS tự động với chứng chỉ self-signed
- Hỗ trợ SAN (Subject Alternative Names) cho localhost, IP nội bộ
- **No-cache headers** cho API & HTML responses (chống cache dữ liệu nhạy cảm)

### 7.4 Vault Mật Khẩu
- Lưu trữ mật khẩu theo chuẩn **KeePass** (kdbxweb)
- Mã hóa AES-256 cho dữ liệu vault

### 7.5 Upload & File
- Validate file upload qua **busboy** (kiểm tra MIME type, kích thước)
- Path traversal protection trên static file serving

---

## 8. Điểm Ưu Việt & Khác Biệt

### ✅ Mã Nguồn Mở (Apache-2.0)
- Miễn phí sử dụng cho doanh nghiệp
- Có thể tùy chỉnh, mở rộng theo nhu cầu
- Không phụ thuộc vendor, không bị lock-in

### ✅ All-in-One (Tất cả trong một)
- ITAM + Helpdesk + Incident + Maintenance + Password Vault + KB + Document + Spare Parts
- Không cần mua nhiều phần mềm riêng lẻ
- Một giao diện thống nhất cho mọi nghiệp vụ IT

### ✅ Tự Động Hóa Cao
- **Email-to-Ticket:** Tự tạo ticket từ email gửi đến (mỗi 2 phút)
- **Auto-Close:** Tự đóng ticket hết hạn
- **Alert Scanner:** Cảnh báo tài sản hết bảo hành, giấy phép hết hạn
- **Recurring Maintenance:** Tự tạo lịch bảo trì định kỳ
- **Auto-Scan Agent:** PowerShell agent quét phần cứng/phần mềm trên máy tính

### ✅ Multi-Platform
- **Web:** Truy cập qua trình duyệt (mọi thiết bị)
- **Desktop:** Ứng dụng Electron native (Windows/Mac/Linux)
- **Mobile:** HTTPS + camera QR scan
- **Docker:** Triển khai container hóa

### ✅ Tích Hợp AI (Google Gemini)
- AI Chatbot hỗ trợ kỹ thuật
- Phân tích thông minh dữ liệu tài sản
- Gợi ý giải pháp cho ticket

### ✅ Hiệu Suất Cao
- **React 19 Server Components:** Render phía server, giảm JavaScript gửi client
- **SWR Cache + Optimistic UI:** Xóa/thêm dữ liệu tức thì, không chờ API
- **TanStack Table:** Bảng hàng nghìn dòng mượt mà
- **4GB Memory Allocation:** Xử lý dữ liệu lớn không bị crash

### ✅ Developer Experience
- **TypeScript end-to-end:** Type-safe từ database → API → UI
- **Prisma ORM:** Migration tự động, type-safe queries, studio GUI
- **Hot Reload:** Development mode với instant refresh
- **Database Tools:** Seed, studio, reset, restore tích hợp sẵn

### ✅ Dễ Triển Khai
- **Docker Compose:** Một lệnh chạy toàn bộ stack
- **Auto SSL:** Không cần cấu hình chứng chỉ thủ công
- **Auto Migration:** Database tự cập nhật schema khi deploy
- **Zero External Dependencies:** Không cần Redis, message queue, hay cron daemon

---

## 9. Yêu Cầu Hệ Thống

### Tối Thiểu
| Thành phần | Yêu cầu |
|-----------|---------|
| **CPU** | 2 cores |
| **RAM** | 4 GB |
| **Disk** | 20 GB SSD |
| **OS** | Windows 10+, Ubuntu 20.04+, macOS 12+ |
| **Node.js** | 22+ |
| **PostgreSQL** | 16+ |

### Khuyến Nghị (Production)
| Thành phần | Yêu cầu |
|-----------|---------|
| **CPU** | 4 cores |
| **RAM** | 8 GB |
| **Disk** | 100 GB SSD |
| **Docker** | 24+ với Docker Compose v2 |

---

## 10. Cấu Trúc Thư Mục Dự Án

```
simply-it-community/
├── prisma/                    # Schema CSDL & migrations
│   ├── schema.prisma          # Định nghĩa 40+ models
│   ├── seed.ts                # Dữ liệu mẫu ban đầu
│   └── migrations/            # Lịch sử migration
├── public/
│   └── uploads/               # File upload từ người dùng
├── src/
│   ├── app/
│   │   ├── (auth)/            # Trang đăng nhập/đăng ký
│   │   ├── (dashboard)/       # 17 module dashboard
│   │   ├── api/               # 51 module API routes
│   │   ├── portal/            # Portal người dùng cuối
│   │   └── scan/              # Trang quét QR/barcode
│   ├── components/            # React components tái sử dụng
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Utilities, Prisma client, auth
│   └── stores/                # Zustand stores
├── server.js                  # Custom HTTP/HTTPS server
├── Dockerfile                 # Multi-stage production build
├── docker-compose.yml         # Stack đầy đủ (DB + App)
├── docker-entrypoint.sh       # Auto migration khi deploy
├── next.config.ts             # Cấu hình Next.js
├── tailwind.config.ts         # Cấu hình Tailwind CSS
└── package.json               # Dependencies & scripts
```

---

## 11. Scripts Có Sẵn

```bash
npm run dev          # Chạy development (hot-reload)
npm run build        # Build production
npm start            # Chạy production server
npm run desktop      # Chạy Electron desktop app
npm run lint         # Kiểm tra lỗi code
npm run db:generate  # Tạo Prisma Client
npm run db:migrate   # Chạy migration
npm run db:push      # Đẩy schema lên DB (không migration)
npm run db:seed      # Tạo dữ liệu mẫu
npm run db:studio    # Mở Prisma Studio GUI
npm run db:reset     # Reset toàn bộ database
npm run db:restore-dir  # Khôi phục từ backup
```

---

## 12. Tổng Kết

Simply IT Community Edition là giải pháp **ITAM & Helpdesk mã nguồn mở** hiện đại, được xây dựng trên stack công nghệ tiên tiến nhất (Next.js 15 + React 19 + TypeScript + Prisma + PostgreSQL). Với thiết kế **all-in-one**, hệ thống tự động hóa cao, multi-platform, và tích hợp AI, Simply IT CE là lựa chọn lý tưởng cho các tổ chức muốn:

- **Tiết kiệm chi phí:** Mã nguồn mở, không phí license
- **Triển khai nhanh:** Docker Compose một lệnh
- **Tùy chỉnh linh hoạt:** TypeScript end-to-end, kiến trúc module rõ ràng
- **Mở rộng dễ dàng:** API RESTful 51 module, sẵn sàng tích hợp

---

*Tài liệu này được tạo tự động bởi Simply IT Team.*  
*© 2026 Simply IT Community Edition - Apache-2.0 License*
