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
5. **Quy Ước Phân Chia Tính Năng Miễn Phí (Community) vs Trả Phí (Enterprise / Pro)**:
   - **Bản Miễn Phí (Community Edition)**:
     - Gửi email thông báo hệ thống tự động qua **SMTP** luôn nằm ở bản Free.
     - Các tính năng quản lý tài sản (ITAM), quản lý người dùng, license nội bộ, vật tư dự phòng, danh mục.
   - **Bản Trả Phí (Enterprise / Pro Edition)**:
     - **QUY TẮC MẶC ĐỊNH BẮT BUỘC**: **TẤT CẢ các tính năng mới thêm vào hệ thống TỰ ĐỘNG THUỘC VỀ BẢN TRẢ PHÍ (ENTERPRISE / PRO)**, trừ khi User yêu cầu rõ ràng cụ thể là đưa tính năng đó vào bản Free/Community.
     - Tính năng **Tiếp nhận Ticket qua Email (Inbound Email-to-Ticket qua IMAP, bóc tách file đính kèm, conversation threading, tự động điều phối)** thuộc bản Trả phí (Enterprise). Bắt buộc kiểm tra `getActiveLicense().isEnterprise`.
     - Các tính năng mở rộng khác: Floor Maps, Discovery / Auto-Scan Pro, AI Chatbot chuyên sâu, Kiểm toán tài sản nâng cao...
     - Khi xây dựng tính năng mới thuộc bản trả phí: Phải chặn ở API backend (`getActiveLicense()`) và hiển thị huy hiệu `👑 Enterprise` hoặc Banner hướng dẫn kích hoạt bản quyền ở frontend khi chạy trên bản Community.
