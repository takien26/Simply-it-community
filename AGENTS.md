# AGENTS.md - Chỉ Dẫn Tự Động Dành Cho AI Agent

Chào AI Agent! Đây là repository của dự án **Simply IT** (Hệ thống Quản lý Tài sản CNTT & Dịch vụ Doanh nghiệp).
Trước khi thực hiện bất kỳ thao tác nào, hãy tuân thủ các chỉ dẫn dưới đây:

---

## 1. Ngữ Cảnh Dự Án & Bộ Nhớ (Context & Memory)
- Đọc ngay file [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) để nắm toàn bộ tiến độ, kiến trúc, và các tính năng vừa triển khai (Phiên bản v1.0.1: Vòng đời nhân sự nghỉ việc, Khung chat AI kéo thả, Menu chuột phải trên bảng tài sản, Khắc phục SMTP, Tự động nhận diện thiết bị Laptop/Desktop/Server).
- Đọc [CHANGELOG.md](./CHANGELOG.md) để xem chi tiết lịch sử cập nhật.

---

## 2. Quy Ước Bắt Buộc (Critical Rules)
1. **Đồng bộ 2 Repository GitHub**:
   - Khi commit và push, phải luôn đẩy mã nguồn lên cả 2 repository:
     - Repo 1: `https://github.com/takien26/Simply-it-community.git`
     - Repo 2: `https://github.com/takien26/Simply-IT.git`
2. **Kiểm tra biên dịch trước khi hoàn thành**:
   - Luôn chạy lệnh `npm run build` để đảm bảo 0 lỗi TypeScript và cú pháp trước khi push code.
3. **Phong cách Lập trình Tối giản (Lazy Senior Dev / Ponytail)**:
   - Viết code ngắn gọn, dứt khoát, giải quyết triệt để tận gốc rễ vấn đề (Root Cause), không tạo boilerplate hay abstraction thừa thãi.
   - Tận dụng tối đa Standard Library và các helper đã có sẵn trong `src/lib/`.
4. **Ngôn ngữ phản hồi**:
   - Luôn giao tiếp và giải thích với người dùng bằng Tiếng Việt rõ ràng, súc tích.
5. **Quy ước Cổng Mạng Kép (Dual-Port HTTP 3000 & HTTPS 3443)**:
   - Hệ thống luôn chạy đồng thời 2 cổng:
     - **HTTP (Cổng 3000)**: Cho truy cập web nội bộ, API, và dashboard thông thường.
     - **HTTPS (Cổng 3443)**: Chạy chứng chỉ SSL (tự ký `selfsigned`) bắt buộc để trình duyệt trên Mobile/Tablet cấp quyền Camera quét mã vạch và QR Code (`/scan`, `/assets/audit`).
   - Mọi cấu hình liên quan đến server (`server.js`), Docker (`Dockerfile`, `docker-compose.yml`), script tự động cập nhật (`update.sh`, `update.bat`), script thu thập (`public/scripts/*.ps1`) và tài liệu hướng dẫn PHẢI LUÔN đồng bộ chuẩn 2 cổng này (`3000` và `3443`). Tuyệt đối không xóa hay thay đổi sang cổng khác mà không có yêu cầu.
6. **Chuẩn Đóng Gói Docker & Chống Lỗi File Script (CRLF vs LF)**:
   - Trong `Dockerfile` stage `runner`: Bắt buộc phải copy `server.js`, `next.config.ts`, `tsconfig.json` và mở cả 2 cổng `EXPOSE 3000` & `EXPOSE 3443`.
   - Các file script Linux (`.sh`) phải luôn giữ định dạng kết thúc dòng `LF`. `Dockerfile` luôn có `sed -i 's/\r$//'` để loại bỏ ký tự `\r` của Windows tránh lỗi `bad interpreter`.
   - Trong `docker-compose.yml`: Phải ánh xạ cả 2 cổng `"3000:3000"` và `"3443:3443"`, đồng thời truyền biến `PORT: 3000` và `HTTPS_PORT: 3443`.
   - Luôn hướng dẫn người dùng mở tường lửa UFW trên Linux: `sudo ufw allow 3000/tcp && sudo ufw allow 3443/tcp`.
