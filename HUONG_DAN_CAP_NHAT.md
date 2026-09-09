# 🔄 HƯỚNG DẪN CẬP NHẬT MÃ NGUỒN (UPDATE CODE) SIMPLY IT
> **Tài liệu hướng dẫn nâng cấp phiên bản mới nhất từ GitHub an toàn 100%, bảo toàn nguyên vẹn cơ sở dữ liệu và cấu hình hệ thống!**

---

## 🎯 NGUYÊN TẮC AN TOÀN TRƯỚC KHI CẬP NHẬT

Khi tác giả phát hành bản cập nhật mới trên GitHub (sửa lỗi, thêm tính năng mới, bổ sung song ngữ...):
* 🔒 **Cơ sở dữ liệu của bạn KHÔNG BỊ MẤT**: Toàn bộ tài sản, vé ticket, nhân sự, giấy phép, mật khẩu lưu trong PostgreSQL đều được giữ nguyên vẹn 100%.
* ⚙️ **Cấu hình file `.env` KHÔNG BỊ THAY ĐỔI**: Mật khẩu database, API key Gemini/OpenAI được lưu riêng và không bị ảnh hưởng.
* 💡 **Khuyến nghị an toàn**: Trước khi update, bạn nên tắt ứng dụng đang chạy để tránh xung đột file đang mở.

---

## 🚀 CÁCH 1: CẬP NHẬT 1-CLICK TỰ ĐỘNG TRÊN WINDOWS (DỄ NHẤT)

Nếu bạn đang dùng Windows và cài đặt bằng Git:

1. Tải hoặc đảm bảo trong thư mục `Simply-it-community` có file **`update.bat`**.
2. **Nhấp đúp chuột vào file `update.bat`**.
3. Cửa sổ dòng lệnh sẽ tự động thực hiện toàn bộ các bước:
   * Tải code mới nhất từ GitHub (`git pull`).
   * Cập nhật thư viện bổ sung nếu có (`npm install`).
   * Cập nhật cấu trúc bảng dữ liệu mới (`npx prisma db push`).
   * Biên dịch ứng dụng (`npm run build`).
4. Sau khi hiện thông báo thành công màu xanh lá, bạn chỉ cần nhấn phím bất kỳ để khởi động lại phần mềm!

---

## 🪟 CÁCH 2: CẬP NHẬT THỦ CÔNG TRÊN WINDOWS (CHẠY LỆNH)

### 📌 Trường hợp 2.1: Bạn đã cài đặt bằng Git (Khuyên Dùng)

Mở cửa sổ PowerShell hoặc Terminal tại thư mục `Simply-it-community` (giữ phím `Shift` + Chuột phải > *Open in Terminal*) và gõ lần lượt các lệnh sau:

```powershell
# 1. Tải code mới nhất từ GitHub về máy
git pull origin main

# 2. Cài đặt các thư viện mới (nếu có)
npm install

# 3. Đồng bộ cấu trúc bảng dữ liệu (Bảo toàn 100% dữ liệu cũ)
npx prisma db push

# 4. Biên dịch lại giao diện Next.js
npm run build

# 5. Khởi động lại hệ thống
npm start
# Hoặc click đúp file SimplyIT_Server.exe nếu dùng bản Portable
```

👉 Mở trình duyệt truy cập: **`http://localhost:3001`** (hoặc `http://localhost:3000`).

---

### 📌 Trường hợp 2.2: Bạn tải bằng file ZIP từ GitHub (Không dùng Git)

Nếu trước đây bạn tải mã nguồn bằng nút *Download ZIP* trên GitHub:

1. **Bước 1: Sao lưu cấu hình**:
   * Vào thư mục phần mềm cũ, copy file **`.env`** ra màn hình Desktop để lưu lại mật khẩu và cấu hình kết nối.
2. **Bước 2: Tải bản mới**:
   * Truy cập: **[https://github.com/takien26/Simply-it-community](https://github.com/takien26/Simply-it-community)** > Bấm nút **`Code`** màu xanh > Chọn **`Download ZIP`**.
   * Giải nén file `.zip` mới tải về.
3. **Bước 3: Ghi đè file code**:
   * Copy toàn bộ file trong thư mục mới tải về và dán đè (Replace) vào thư mục phần mềm hiện tại của bạn.
   * Chép lại file **`.env`** từ Desktop vào lại thư mục phần mềm.
4. **Bước 4: Cập nhật & Build**:
   * Mở Terminal tại thư mục phần mềm và chạy:
     ```powershell
     npm install
     npx prisma db push
     npm run build
     ```
   * Khởi động lại phần mềm bằng file `SimplyIT_Server.exe` hoặc `npm start`.

---

## 🐳 CÁCH 3: CẬP NHẬT TRÊN WINDOWS / LINUX QUA DOCKER DESKTOP

Nếu bạn đang chạy Simply IT qua Docker Desktop, việc cập nhật cực kỳ nhanh chóng và đơn giản chỉ với **2 lệnh**:

1. Mở PowerShell hoặc Terminal tại thư mục chứa dự án:
2. Chạy lệnh kéo code mới:
   ```bash
   git pull origin main
   ```
3. Khởi động lại và build lại Docker container:
   ```bash
   docker compose up -d --build
   ```

*💡 Giải thích*: Docker tự động tái tạo container ứng dụng với phiên bản code mới nhất, trong khi toàn bộ dữ liệu database được lưu độc lập tại Docker Volume (`postgres_data`), đảm bảo **không bao giờ mất dữ liệu**.

👉 Truy cập ngay: **`http://localhost:3000`** (hoặc cổng HTTPS **`https://localhost:3443`**).

---

## 🐧 CÁCH 4: CẬP NHẬT TRÊN UBUNTU / LINUX SERVER (VPS DOANH NGHIỆP)

Dành cho máy chủ Ubuntu Linux đang chạy dịch vụ cho toàn công ty.

### 🌟 Phương án 4A: Máy chủ chạy qua Docker (Khuyên Dùng)

Kết nối SSH vào máy chủ VPS / Ubuntu của bạn:

```bash
cd /opt/simply-it

# 1. Kéo code mới nhất từ GitHub
sudo git pull origin main

# 2. Build lại và khởi chạy nền
sudo docker compose up -d --build
```
Hệ thống sẽ hoàn tất nâng cấp trong 30-60 giây mà không cần cấu hình thêm bất kỳ bước nào!

---

### 🛠️ Phương án 4B: Máy chủ chạy Native (Node.js + PM2)

Kết nối SSH vào máy chủ VPS và thực hiện:

```bash
cd /opt/simply-it

# 1. Tạm dừng tiến trình PM2 đang chạy
pm2 stop simply-it

# 2. Kéo code mới từ GitHub
git pull origin main

# 3. Cập nhật thư viện & database schema
npm install
npx prisma db push

# 4. Build lại Next.js
npm run build

# 5. Khởi động lại tiến trình PM2
pm2 restart simply-it
```

---

## ❓ XỬ LÝ CÁC VẤN ĐỀ THƯỜNG GẶP KHI CẬP NHẬT

### 1. Báo lỗi xung đột Git (Git Merge Conflict): *"error: Your local changes would be overwritten by merge"*
* **Nguyên nhân**: Bạn đã tự chỉnh sửa trực tiếp vào file code trong máy mà chưa commit.
* **Cách xử lý**:
  * Giữ lại file cấu hình `.env`, chạy lệnh hủy các thay đổi code tạm thời để đồng bộ với GitHub:
    ```bash
    git reset --hard HEAD
    git pull origin main
    ```

### 2. Lỗi cổng đang chạy: *"Port 3000 or 3001 already in use"*
* **Nguyên nhân**: Tiến trình server cũ chưa tắt hẳn khi biên dịch bản mới.
* **Cách xử lý trên Windows**: Mở Task Manager > Tìm tiến trình `Node.js` hoặc `SimplyIT_Server.exe` > Nhấp **End Task**, sau đó khởi chạy lại.
* **Trên Linux**: Chạy `fuser -k 3000/tcp` hoặc `pm2 restart simply-it`.

### 3. Cần hỗ trợ cập nhật?
* 📧 Email hỗ trợ tác giả: **`takien26@gmail.com`**
* 🐙 Báo cáo lỗi (Issue) trên GitHub: [https://github.com/takien26/Simply-it-community/issues](https://github.com/takien26/Simply-it-community/issues)