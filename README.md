# 📘 Simply IT — Community Edition (CE)
> **"One Platform. Simple IT."**  
> Hệ thống Quản trị Tài sản CNTT (ITAM) & Cổng Hỗ trợ Kỹ thuật (ITSM Helpdesk) Toàn diện, Hiện đại dành cho Doanh nghiệp.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-teal?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg?style=flat-square)](https://opensource.org/licenses/Apache-2.0)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker)](https://www.docker.com/)

---

## 📚 TÀI LIỆU HƯỚNG DẪN DÀNH CHO BẠN

| Tài liệu | Nội dung chính | Định dạng |
| :--- | :--- | :---: |
| 🚀 **[Cẩm Nang Triển Khai Production](./HUONG_DAN_TRIEN_KHAI_PRODUCTION.md)** | Hướng dẫn cài đặt CSDL PostgreSQL, **đổi mật khẩu an toàn**, cấu hình `.env`, chạy nền 24/7 với PM2/Systemd, Nginx SSL HTTPS và tự động sao lưu. | [Markdown](./HUONG_DAN_TRIEN_KHAI_PRODUCTION.md) • [File PDF](./docs/HUONG_DAN_TRIEN_KHAI_PRODUCTION.pdf) |
| 📘 **[Sổ Tay Quản Trị & Vận Hành](./HUONG_DAN_QUAN_TRI_VAN_HANH.md)** | Hướng dẫn cấu hình Đăng nhập Microsoft 365 (SSO Azure AD), đồng bộ Active Directory, cảnh báo Telegram/Zalo, quét tem QR di động, thu hồi tài sản thôi việc và Két mật khẩu. | [Markdown](./HUONG_DAN_QUAN_TRI_VAN_HANH.md) • [File PDF](./docs/HUONG_DAN_QUAN_TRI_VAN_HANH.pdf) |
| 📄 **[Bản Giới Thiệu Hệ Thống PDF](./docs/GIOI_THIEU_HE_THONG_SIMPLY_IT.pdf)** | Tài liệu tổng quan năng lực hệ thống, kiến trúc giải pháp và bảng thông số kỹ thuật dành cho Ban Giám Đốc & Khách hàng. | [File PDF](./docs/GIOI_THIEU_HE_THONG_SIMPLY_IT.pdf) |

---

## ✨ CÁC TÍNH NĂNG CHỦ CHỐT CỦA HỆ THỐNG

### 1. 💻 Quản Lý Vòng Đời Thiết Bị & Tài Sản CNTT (ITAM)
- Quản lý tập trung: Máy tính để bàn, Laptop, Màn hình, Máy in, Thiết bị mạng, Máy chủ và Phụ kiện.
- Tự động tính toán khấu hao tài chính hàng tháng (Linear Depreciation) và Giá trị còn lại (Book Value).
- Tích hợp in tem nhãn Decal mã QR hàng loạt và quét kiểm kê di động bằng camera điện thoại/tablet.
- Script PowerShell Agent tự động thu thập thông số phần cứng (CPU, RAM, Ổ cứng, Serial BIOS) qua Active Directory GPO.

### 2. 🎫 Service Desk & Cổng Tiếp Nhận Sự Cố (ITSM)
- Cổng tự phục vụ (Self-Service Portal) cho nhân viên công ty gửi yêu cầu hỗ trợ và đánh giá sao (CSAT).
- Quản lý Ticket theo 4 cấp độ ưu tiên (P1 Khẩn cấp đến P4 Thấp) và tự động tính hạn cam kết xử lý SLA theo giờ hành chính.
- Tự động gộp bão ticket trùng lặp thành Sự cố diện rộng (Incident Clustering) bằng thuật toán phân tích thông minh.
- Chuyển đổi giải pháp từ Ticket sang Bài viết Cơ sở tri thức (KB Article) chỉ với 1 click.

### 3. 🔑 Quản Lý Bản Quyền Phần Mềm & Dịch Vụ Thuê Bao
- Theo dõi định mức cấp phát ghế (`Used / Total Seats`), hỗ trợ cấp phát phân lô theo nguyên tắc FIFO (hạn gần dùng trước).
- Tự động cảnh báo trước 30 ngày các bản quyền và hợp đồng dịch vụ Internet, Cloud, Tên miền sắp hết hạn.
- Cơ chế khóa tăng nguyên tử (Atomic Database Increment) chống lỗi ghi đè dữ liệu khi nhiều kỹ thuật viên cấp phát đồng thời.

### 4. 🔐 Két Sắt Mật Khẩu Chuẩn Quân Sự (Zero-Trust Password Vault)
- Mã hóa toàn bộ mật khẩu máy chủ, WiFi, tài khoản dịch vụ bằng thuật toán **AES-256-GCM**.
- Che mờ mật khẩu trên giao diện, phân quyền truy cập theo nhóm và bắt buộc Mật khẩu cấp 2 (Master Passphrase).
- Tính năng **Chia sẻ mật khẩu tự hủy (Auto-Burn Secret Link)**: Tự động xóa vĩnh viễn dữ liệu nếu nhập sai mã bảo vệ quá 5 lần.

### 5. 👥 Quy Trình Thôi Việc & Thu Hồi Thiết Bị Số Hóa
- Quy trình Offboarding 1 chạm: Tự động thu hồi bản quyền nhàn rỗi về kho.
- Chuyển thiết bị sang trạng thái `MAINTENANCE` để khử trùng/xóa dữ liệu nhạy cảm trước khi tái cấp phát.
- Tự động vô hiệu hóa phiên đăng nhập JWT của nhân viên nghỉ việc tức thì trong vòng 0 giây.
- Tự động xuất Biên bản Bàn giao & Thu hồi thiết bị số hóa (Word/PDF).

### 6. 📈 Dự Báo Ngân Sách IT 12 Tháng & Bảo Trì Dự Đoán
- Dự toán dòng tiền ngân sách IT 12 tháng tiếp theo: Chi phí gia hạn đường truyền, phần mềm và ngân sách thay thế máy tính hao mòn.
- Thuật toán chấm điểm sức khỏe phần cứng (`HealthScore 0 - 100`) để cảnh báo và lên lịch bảo trì dự đoán trước khi máy tính bị hỏng đột ngột.

---

## ⚡ KHỞI CHẠY NHANH BẰNG DOCKER (30 GIÂY)

Phương thức nhanh nhất để triển khai trên máy tính cá nhân hoặc máy chủ thử nghiệm:

```bash
# 1. Tải mã nguồn về máy
git clone https://github.com/takien26/Simply-it-community.git
cd Simply-it-community

# 2. Khởi chạy toàn bộ hệ thống bằng Docker Compose
docker compose up -d
```

Mở trình duyệt truy cập: **`http://localhost:3000`** (hoặc `http://localhost:3001`):
* **Tài khoản quản trị viên:** `admin@company.com`
* **Mật khẩu khởi tạo:** `Admin@123` *(Hệ thống có thanh cảnh báo màu vàng nhắc bạn đổi mật khẩu ngay sau lần đăng nhập đầu tiên)*.

---

## 🛠️ CÀI ĐẶT THỦ CÔNG CHO MÔI TRƯỜNG PHÁT TRIỂN (DEVELOPMENT)

### Yêu cầu cài đặt trước:
- **Node.js**: Phiên bản 20.x hoặc 22.x LTS.
- **PostgreSQL**: Phiên bản 15 hoặc 16.

### Các bước thực hiện:
```bash
# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Tạo file cấu hình môi trường
cp .env.example .env

# 3. Chỉnh sửa DATABASE_URL trong .env với mật khẩu CSDL của bạn
# Ví dụ: DATABASE_URL="postgresql://postgres:MatKhauCuaBan@localhost:5432/it_asset_db?schema=public"

# 4. Khởi tạo cấu trúc bảng CSDL và nạp dữ liệu mẫu ban đầu
npx prisma db push
npm run db:seed

# 5. Khởi động máy chủ chạy thử nghiệm
npm run dev
```
Truy cập hệ thống tại: **`http://localhost:3000`**.

---

## 🖥️ ĐỀ XUẤT CẤU HÌNH MÁY CHỦ SẢN XUẤT (HARDWARE SIZING)

Hệ thống đã trải qua kiểm nghiệm tải thực tế (Stress-testing) đạt tốc độ xử lý **76.3 requests/giây**, độ trễ phản hồi trung bình **< 50ms**, tỷ lệ lỗi 0.0%:

| Quy mô sử dụng | Số người dùng trực tuyến | Cấu hình máy chủ đề xuất (vCPU / RAM / SSD) | Ghi chú |
| :--- | :---: | :---: | :--- |
| **Quy mô Tiêu chuẩn** | **100 – 300 người** | **4 vCPU • 8 GB RAM • 100 GB SSD NVMe** | 1 Máy chủ duy nhất (Ubuntu Server 22.04/24.04 LTS), chạy mượt mà 24/7. |
| **Quy mô Doanh nghiệp lớn** | **500 – 1,000+ người** | **8 vCPU • 16 GB RAM • 250 GB SSD NVMe** | Mô hình tách rời: 1 App Server (Node.js) + 1 Database Server (PostgreSQL). |

👉 **Xem hướng dẫn cài đặt chi tiết từng bước tại:** [HUONG_DAN_TRIEN_KHAI_PRODUCTION.md](./HUONG_DAN_TRIEN_KHAI_PRODUCTION.md).

---

## 📄 GIẤY PHÉP MÃ NGUỒN MỞ (LICENSE)

Dự án Simply IT Community Edition được phát hành theo giấy phép mã nguồn mở **[Apache License 2.0](LICENSE)**. Bạn hoàn toàn có quyền sử dụng, tùy biến và triển khai tự do trong doanh nghiệp của mình.

---

## 🤝 LIÊN HỆ & ĐÓNG GÓP PHÁT TRIỂN

* **Tác giả:** Tạ Trung Kiên
* **Email:** [takien26@gmail.com](mailto:takien26@gmail.com)
* **GitHub Repository:** [https://github.com/takien26/Simply-it-community](https://github.com/takien26/Simply-it-community)
