# 📘 Simply IT — Community Edition (CE)
> **"One platform. Simple IT."**  
> An open-source, modern, and unified IT Asset Management (ITAM) and Helpdesk (ITSM) platform for growing teams and enterprises.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

[English Overview](#english-overview) • [Tổng Quan Tiếng Việt](#tổng-quan-tiếng-việt) • [📖 **Hướng Dẫn Cài Đặt (A-Z)**](./HUONG_DAN_CAI_DAT.md) • [📘 **Giới Thiệu Tính Năng Chi Tiết**](./GIOI_THIEU_TINH_NANG_SIMPLY_IT.md)

> 💡 **Tài liệu PDF chính thức tải về máy:**  
> * 📥 [**Tải File PDF Hướng Dẫn Cài Đặt Từ A-Z (HUONG_DAN_CAI_DAT_SIMPLY_IT.pdf)**](./HUONG_DAN_CAI_DAT_SIMPLY_IT.pdf)
> * 📥 [**Tải File PDF Giới Thiệu Tính Năng Chi Tiết (GIOI_THIEU_TINH_NANG_SIMPLY_IT.pdf)**](./GIOI_THIEU_TINH_NANG_SIMPLY_IT.pdf)

---

## 🚀 Quick Start with Docker (30 Seconds)

The fastest way to deploy Simply IT Community Edition on your server or local machine:

```bash
# 1. Clone this repository
git clone https://github.com/takien26/simply-it-community.git
cd simply-it-community

# 2. Start PostgreSQL and Simply IT containers
docker compose up -d
```

Open your browser at **`http://localhost:3000`** and log in with default credentials:
* **Email:** `admin@company.com`
* **Password:** `Admin@123`

*(You will be prompted to change the default password after first login).*

---

## <a name="english-overview"></a>🌐 English Overview

**Simply IT Community Edition** is designed to streamline day-to-day IT operational workflows without bloated complexity:

### ✨ Core Features

* **💻 Hardware Asset Management (ITAM)**: Track complete hardware lifecycles (procurement, user allocation, warranties, servicing, disposal).
* **🏷️ QR Code & Barcode Labeling**:
  * Auto-generate standard Decal labels for printers.
  * Instant QR code scanning via mobile phone or laptop camera for field audits.
  * Batch Excel import and export.
* **🎫 Helpdesk & Ticket Portal (ITSM)**:
  * Self-service user ticket portal.
  * Technician assignment, priority levels (P1 - P4), and committed resolution deadlines (SLA).
  * Activity thread, attachments, and resolution documentation.
* **🔑 Software Licenses & SaaS Tracker**:
  * Monitor Seat utilization (`Used / Total Seats`) with color-coded threshold bars.
  * 30-day proactive expiry alerts on the executive dashboard.
* **🔐 Secure Password Vault**:
  * AES-256 encrypted credential store for WiFi, server access, and shared systems.
* **🤖 AI Copilot (BYOK - Bring Your Own Key)**:
  * Integrate Google Gemini API free-tier key for technical troubleshooting, OCR specs extraction, and advice.
* **🌐 Bilingual Support**: 100% native support for both **English** and **Tiếng Việt**.

---

## <a name="tổng-quan-tiếng-việt"></a>🇻🇳 Tổng Quan Tiếng Việt

**Simply IT Community Edition** là nền tảng quản trị tài sản & hỗ trợ CNTT tinh gọn, mạnh mẽ dành cho doanh nghiệp vừa và nhỏ (SME) hoặc đội ngũ kỹ thuật nội bộ:

### ✨ Các Tính Năng Nổi Bật

1. **Quản lý Vòng đời Tài sản (ITAM)**:
   - Theo dõi trọn vẹn từ lúc mua, cấp phát cho nhân viên, bảo hành, sửa chữa đến thanh lý.
   - Quản lý đa chủng loại: Laptop, PC, Màn hình, Máy in, Thiết bị mạng, Phụ kiện...
2. **In Tem Nhãn & Quét Mã QR Kiểm Kê**:
   - In tem nhãn mã QR chuẩn khổ Decal văn phòng.
   - Sử dụng Camera điện thoại / máy tính bảng quét mã kiểm kê thực tế tại chỗ.
   - Nhập / Xuất dữ liệu 2 chiều với file Excel.
3. **Cổng Tiếp Nhận Sự Cố & Helpdesk (ITSM)**:
   - Cổng tự phục vụ (Self-Service) cho nhân viên gửi yêu cầu hỗ trợ.
   - Phân công kỹ thuật viên, theo dõi tiến độ, cam kết hạn xử lý SLA (P1 đến P4).
   - Trao đổi bình luận, tải biên bản và hình ảnh lỗi.
4. **Quản trị Bản Quyền Phần Mềm & Dịch Vụ**:
   - Quản lý Seat bản quyền (Microsoft 365, CAD, Zoom, Antivirus...).
   - Cảnh báo trực quan các License và hợp đồng Internet sắp hết hạn trong 30 ngày.
5. **Két Sắt Mật Khẩu An Toàn**:
   - Lưu trữ thông tin tài khoản quản trị mạng, server, wifi mã hóa chuẩn AES-256.
6. **Trợ Lý Ảo AI Copilot**:
   - Cho phép người dùng tự điền Google Gemini API Key miễn phí để hỏi đáp kỹ thuật và đọc tem thông số máy ảnh.
7. **Song Ngữ Hoàn Chỉnh**: Hỗ trợ chuyển đổi tức thì giữa **Tiếng Việt** và **Tiếng Anh**.

---

## 📊 Feature Comparison: Community vs. Enterprise

| Feature | Community Edition (Free) | Enterprise Edition |
| :--- | :---: | :---: |
| Full IT Asset Lifecycle & QR Printing | ✅ Yes | ✅ Yes |
| Mobile Camera QR Scanner & Audit | ✅ Yes | ✅ Yes |
| Helpdesk Ticket Portal & SLA (P1 - P4) | ✅ Yes | ✅ Yes |
| Software License & SaaS Expiry Tracker | ✅ Yes | ✅ Yes |
| AES-256 Password Vault | ✅ Yes | ✅ Yes |
| Native Bilingual (Vietnamese & English) | ✅ Yes | ✅ Yes |
| AI Copilot (Bring Your Own Key) | ✅ Yes | ✅ Cloud Gateway Included |
| Automated Telegram / Teams Alerts | ❌ | ✅ Yes |
| Microsoft 365 SSO (Azure AD) | ❌ | ✅ Yes |
| LDAP / Active Directory Windows Server Sync | ❌ | ✅ Yes |
| Interactive Floor Maps & Rack Layouts | ❌ | ✅ Yes |
| Smart Auto-Routing Engine | ❌ | ✅ Yes |
| Network Discovery LAN Scanner | ❌ | ✅ Yes |
| Dedicated SLA Support & Custom Deployment | ❌ | ✅ Yes |

---

## 🛠️ Local Development Setup (Manual)

If you wish to run Simply IT without Docker:

### Prerequisites
* **Node.js**: `v20.0.0` or later
* **PostgreSQL**: `v15` or later

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Update DATABASE_URL in .env with your PostgreSQL credentials
# Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/it_asset_db?schema=public"

# 4. Push Prisma schema & seed default data
npx prisma db push
npm run db:seed

# 5. Start development server
npm run dev
```

The application will be running at `http://localhost:3000`.

---

## 📄 License

Simply IT Community Edition is open-sourced software licensed under the **[Apache License 2.0](LICENSE)**.

---

## 🤝 Contact & Enterprise Inquiries

* **Author:** Tạ Trung Kiên
* **Email:** [takien26@gmail.com](mailto:takien26@gmail.com)
* **GitHub:** [https://github.com/takien26](https://github.com/takien26)
* **Website / Commercial Inquiries:** [Contact via Email](mailto:takien26@gmail.com)

---

## ☕ Ủng Hộ / Donate Phát Triển Dự Án

Nếu bạn thấy phần mềm **SIMPLY IT** hữu ích và giúp công việc của bạn hiệu quả hơn, bạn có thể ủng hộ tác giả ly cà phê để tiếp thêm động lực phát triển thêm nhiều tính năng mới cho cộng đồng:

| Quét mã VietQR | Thông tin chuyển khoản |
| :--- | :--- |
| <img src="./donate_qr.png" width="160" alt="VietQR Donate" /> | 🏦 **Ngân hàng**: **BIDV** (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)<br><br>💳 **Số tài khoản**: `2141876442`<br><br>👤 **Chủ tài khoản**: **TA TRUNG KIEN**<br><br>📝 **Nội dung**: `Ung ho Simply IT` |

*Trân trọng cảm ơn sự ủng hộ của bạn!*

