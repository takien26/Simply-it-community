# Simply IT - Project Context & AI Memory Handover (Bàn Giao Ngữ Cảnh)

> 📌 **Mục đích tài liệu:** Lưu giữ toàn bộ ngữ cảnh, tư duy thiết kế, các quyết định nghiệp vụ đã thống nhất và hướng dẫn dành cho AI Assistant (Antigravity / Gemini) khi chuyển đổi sang máy tính mới hoặc bắt đầu phiên làm việc mới.

---

## 1. Thông Tin Tổng Quan & Triết Lý Phát Triển
- **Dự án:** Simply IT - Hệ thống Quản trị Tài sản CNTT (ITAM) & Helpdesk Service Desk cho Doanh nghiệp / Tập đoàn.
- **Tech Stack:**
  - **Framework:** Next.js 15 (App Router), React 19, Tailwind CSS.
  - **Database & ORM:** PostgreSQL, Prisma ORM (`prisma/schema.prisma`).
  - **Server Runtime:** Node.js (`server.js` tùy chỉnh hỗ trợ cả HTTP :3001 và HTTPS :3443).
  - **Client Caching:** Hệ thống SWR tự viết (`src/lib/client-cache.ts`) tối ưu độ trễ 0ms, BroadcastChannel và custom events cho Reactive Sync giữa các tab/modal.
- **Triết lý làm việc (Ponytail Senior Dev Mode):**
  - Đơn giản, thực dụng, tôn trọng nghiệp vụ thực tế, không over-engineering.
  - Giao diện phản hồi 0ms (Optimistic UI) cho các thao tác xóa, thêm, sửa.
  - Mọi logic phi vụn vặt đều phải có kiểm thử tự động xác minh (`scripts/qa-system-audit.js`).

---

## 2. Các Quyết Định Nghiệp Vụ Cốt Lõi Đã Thống Nhất Cùng User

### 🗑️ 2.1. Thùng Rác (Recycle Bin) & Khôi Phục Tức Thì
- **Thời gian lưu trữ mặc định:** **30 ngày** (có thể cấu hình trong bảng `system_settings`).
- **Cơ chế Soft-Delete:** Khi xóa Tài sản, Bản quyền, Nhân sự... hệ thống chụp lại bản snapshot đầy đủ lưu vào bảng `TrashItem`, xóa khỏi bảng chính để bảo đảm tính toàn vẹn.
- **Auto-Purge:** Tự động quét dọn vĩnh viễn các mục có `expiresAt < now()`.
- **0ms Undo Toast (`TrashUndoToast.tsx`):**
  - Khi người dùng xóa bất kỳ mục nào, popup nổi ở góc phải màn hình trong **4 giây** kèm thanh tiến trình thu nhỏ dần.
  - Bấm **`[ ↩️ Hoàn tác ]`** sẽ phục hồi bản ghi ngay lập tức tại chỗ và xóa cache để bảng hiển thị lại thiết bị/nhân sự mà không cần tải lại trang.
- **Phím tắt nhanh trên trang Tài sản:** Nút `🗑️ Thùng rác (N)` trực tiếp trên thanh filter của trang `/assets`.

### 🔑 2.2. Cho Phép Vượt Định Mức Bản Quyền (License Over-Allocation / True-up)
- **Quy tắc:** Trong thực tế IT doanh nghiệp, việc cấp phát license vượt số chỗ mua (over-allocation) là **HOÀN TOÀN ĐƯỢC PHÉP** (phục vụ cấp phát khẩn cấp, thời gian ân hạn hoặc đối soát True-up cuối năm).
- **Hành vi hệ thống:** Không chặn lỗi 400. Hệ thống cho phép gán tiếp, cập nhật số `usedSeats` chính xác (ví dụ: `5/2 seats`), và trả về cờ `isOverAllocated: true` kèm thông báo ghi nhận vượt hạn mức.

### 💰 2.3. Khấu Hao Tài Chính & Tiền Tệ
- Tính khấu hao theo phương pháp đường thẳng (Straight-Line).
- Đã bọc an toàn chống chia cho 0 (`usefulLifeMonths <= 0`) để không bao giờ bị vỡ giao diện hiển thị `NaN ₫`.
- Hỗ trợ đa tiền tệ (VND, USD, EUR, JPY, SGD) với tỉ giá hối đoái.

### 👥 2.4. Quy Trình Nghỉ Việc (Offboarding)
- Khi nhân viên nghỉ việc: Thu hồi toàn bộ máy tính về trạng thái `AVAILABLE`, thu hồi các bản quyền phần mềm (`revokedAt`), khóa tài khoản đăng nhập (`isActive = false`) và từ chối đăng nhập (HTTP 403).

---

## 3. Cấu Trúc Mã Nguồn Quan Trọng
- `src/lib/trash.ts`: Thư viện xử lý Thùng rác, snapshot dữ liệu, tính ngày hết hạn và khôi phục.
- `src/components/common/TrashUndoToast.tsx`: Toast hoàn tác 0ms nổi trên màn hình.
- `src/lib/client-cache.ts`: Quản lý bộ nhớ đệm SWR và đồng bộ revalidation đa tab.
- `src/app/api/system/backup/`: Hệ thống sao lưu và phục hồi toàn bộ database + upload qua file `.zip`.
- `scripts/qa-system-audit.js`: Kịch bản kiểm thử tự động toàn diện 52 ca test qua 9 module (100% PASS).

---

## 4. Hướng Dẫn Cho AI Khi Bắt Đầu Phiên Mới
Khi người dùng mở một phiên làm việc mới trên máy mới:
1. Đọc file này để nắm trọn vẹn phong cách, các quy tắc và quyết định đã thống nhất.
2. Kiểm tra trạng thái Git (`git status`, `git log -n 5`) để biết commit gần nhất.
3. Luôn trả lời ngắn gọn, trực diện, đúng trọng tâm kỹ thuật bằng tiếng Việt.
