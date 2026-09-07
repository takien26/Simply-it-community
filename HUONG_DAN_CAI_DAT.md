# 📖 HƯỚNG DẪN CÀI ĐẶT SIMPLY IT COMMUNITY EDITION TỪ A ĐẾN Z
> **Dành cho mọi người dùng — Dễ hiểu, chi tiết từng bước, không cần am hiểu sâu về IT vẫn làm theo thành công 100%!**

---

## 🎯 BẠN NÊN CHỌN CÁCH CÀI ĐẶT NÀO?

Hệ thống hỗ trợ 3 phương án cài đặt phổ biến nhất. Hãy chọn cách phù hợp nhất với máy tính của bạn:

| Phương thức | Phù hợp với ai? | Độ khó | Thời gian chuẩn bị |
| :--- | :--- | :---: | :---: |
| 🪟 **Cách 1: Windows thường (Chạy file .exe)** | Người dùng Windows cá nhân hoặc văn phòng muốn cài trực tiếp lên máy tính. | ⭐ Rất dễ | ~5 - 10 phút |
| 🐳 **Cách 2: Windows qua Docker Desktop** | Người thích sự tiện lợi, tự động hóa, không muốn cài thủ công cơ sở dữ liệu. | ⭐⭐ Dễ nhất | ~3 - 5 phút (Chỉ 1 lệnh) |
| 🐧 **Cách 3: Ubuntu / Linux Server** | Triển khai lên máy chủ công ty, máy ảo VPS để toàn bộ nhân viên truy cập 24/7. | ⭐⭐⭐ Cơ bản | ~5 - 10 phút |

---

## 📥 BƯỚC 0: TẢI MÃ NGUỒN PHẦN MỀM TỪ GITHUB

Dù bạn cài theo cách nào, trước tiên hãy tải bộ mã nguồn về máy:

### • Cách 0.1: Tải trực tiếp file ZIP (Dễ nhất cho người mới)
1. Mở trình duyệt và truy cập trang GitHub: **[https://github.com/takien26/Simply-it-community](https://github.com/takien26/Simply-it-community)**
2. Bấm vào nút màu xanh lá cây: **`<> Code`** (ở phía trên bên phải danh sách file).
3. Chọn dòng: **`Download ZIP`**.
4. Sau khi tải về xong, nhấp chuột phải vào file `.zip` vừa tải > Chọn **Extract All... (Giải nén tất cả)** vào một thư mục dễ nhớ (ví dụ: `D:\Simply-it-community` hoặc `C:\Simply-it-community`).

### • Cách 0.2: Tải bằng Git (Dành cho người đã cài Git)
Mở cửa sổ dòng lệnh (Terminal hoặc PowerShell) và gõ lệnh sau:
```bash
git clone https://github.com/takien26/Simply-it-community.git
cd Simply-it-community
```

---

## 🪟 CÁCH 1: CÀI ĐẶT TRÊN WINDOWS THƯỜNG (CHẠY FILE .EXE)

Đây là cách cài trực tiếp trên máy tính Windows mà không cần Docker.

### 📌 Bước 1.1: Cài đặt Node.js
1. Truy cập trang chủ Node.js: **[https://nodejs.org/](https://nodejs.org/)**
2. Tải bản **LTS (Khuyên dùng)** dành cho Windows (file `.msi`).
3. Mở file vừa tải lên, bấm liên tục **Next** -> tích vào ô đồng ý điều khoản -> **Next** -> **Install** -> **Finish**.
4. *Kiểm tra*: Mở PowerShell và gõ: `node -v` (nếu hiện ra phiên bản từ `v20.x` trở lên là thành công).

### 📌 Bước 1.2: Cài đặt Cơ sở dữ liệu PostgreSQL
1. Truy cập trang tải PostgreSQL cho Windows: **[https://www.enterprisedb.com/downloads/postgres-postgresql-downloads](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads)**
2. Tải bản mới nhất (ví dụ PostgreSQL 16 hoặc 18) cho Windows x86-64.
3. Chạy file cài đặt:
   * Bấm **Next** qua các bước mặc định.
   * **ĐẶC BIỆT LƯU Ý BƯỚC MẬT KHẨU (Password)**: Nhập mật khẩu quản trị cơ sở dữ liệu của bạn, ví dụ: `Admin@123` (hãy nhớ mật khẩu này nhé!).
   * Cổng mặc định: Giữ nguyên là **`5432`**.
   * Tiếp tục bấm **Next** cho đến khi hoàn tất cài đặt.

### 📌 Bước 1.3: Cấu hình kết nối cơ sở dữ liệu (`.env`)
1. Vào thư mục phần mềm `Simply-it-community` đã giải nén ở Bước 0.
2. Tìm file có tên là **`.env.example`**, sao chép (Copy) và đổi tên thành **`.env`** (chú ý có dấu chấm ở đầu).
3. Mở file `.env` bằng Notepad và kiểm tra dòng:
   ```env
   DATABASE_URL="postgresql://postgres:Admin@123@localhost:5432/it_asset_db?schema=public"
   ```
   *(Thay `Admin@123` bằng mật khẩu PostgreSQL bạn đã đặt ở Bước 1.2 nếu khác)*.
4. Lưu file lại (`Ctrl + S`).

### 📌 Bước 1.4: Cài đặt thư viện và khởi tạo Database
1. Giữ phím `Shift` và **nhấp chuột phải** vào khoảng trống trong thư mục `Simply-it-community` > Chọn **Open in Terminal** (hoặc *Open PowerShell window here*).
2. Gõ các lệnh sau (chờ từng lệnh chạy xong):
   ```powershell
   # 1. Tải toàn bộ thư viện cần thiết
   npm install

   # 2. Tự động tạo bảng dữ liệu
   npx prisma db push

   # 3. Nạp dữ liệu mẫu ban đầu (phân quyền, danh mục...)
   npm run seed
   ```

### 📌 Bước 1.5: Khởi chạy phần mềm
Bây giờ mọi thứ đã sẵn sàng 100%, bạn có thể chọn 1 trong 2 cách mở:

* **Cách nhanh nhất (Khuyên dùng)**:
  * Trong thư mục, chỉ cần **click đúp vào file `SimplyIT_Server.exe`**.
  * Phần mềm sẽ tự động khởi động dịch vụ cơ sở dữ liệu, chạy ngầm dưới khay hệ thống (System Tray - cạnh đồng hồ Windows) và tự động bật trình duyệt web lên!
* **Cách bằng dòng lệnh**:
  * Chạy: `npm run build` (chỉ cần chạy lần đầu).
  * Chạy: `npm start`.

👉 Trình duyệt web sẽ mở tại: **`http://localhost:3001`** *(hoặc `http://localhost:3000`)*.

---

## 🐳 CÁCH 2: CÀI ĐẶT TRÊN WINDOWS QUA DOCKER DESKTOP (ĐƠN GIẢN NHẤT)

Nếu bạn không muốn cài PostgreSQL và cấu hình từng bước rườm rà, Docker sẽ làm thay bạn toàn bộ từ A-Z chỉ bằng **1 dòng lệnh duy nhất**!

### 📌 Bước 2.1: Cài đặt Docker Desktop
1. Tải Docker Desktop cho Windows tại: **[https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)**
2. Cài đặt và tích chọn hỗ trợ **WSL 2** (nếu máy hỏi khởi động lại máy thì chọn Restart).
3. Sau khi máy khởi động lại, bật ứng dụng **Docker Desktop** lên và đợi thanh trạng thái ở góc dưới bên trái chuyển sang màu **xanh lá cây (Engine running)**.

### 📌 Bước 2.2: Khởi chạy trọn gói hệ thống
1. Mở thư mục `Simply-it-community` đã tải ở Bước 0.
2. Giữ phím `Shift` + **Chuột phải** vào khoảng trống > Chọn **Open in Terminal** (hoặc PowerShell).
3. Gõ đúng 1 dòng lệnh sau rồi nhấn Enter:
   ```bash
   docker compose up -d --build
   ```
4. **Hệ thống sẽ tự động**:
   * Tải và cấu hình máy chủ cơ sở dữ liệu PostgreSQL chuẩn 16.
   * Biên dịch ứng dụng SIMPLY IT.
   * Tự động kết nối và nạp sẵn dữ liệu ban đầu.
   * Chạy ngầm toàn bộ dịch vụ 24/7.

👉 Mở trình duyệt bất kỳ (Chrome/Edge) và truy cập: **`http://localhost:3000`**

*(💡 Để tắt hệ thống khi không dùng nữa: Gõ `docker compose down`)*.

---

## 🐧 CÁCH 3: CÀI ĐẶT TRÊN UBUNTU / LINUX SERVER (VPS DOANH NGHIỆP)

Dành cho quản trị viên muốn cài đặt lên máy chủ Ubuntu (bản 20.04 hoặc 22.04 LTS) để phục vụ cho toàn công ty qua mạng LAN hoặc Internet.

### 🌟 Phương án 3A: Cài qua Docker trên Ubuntu (Khuyên dùng nhất)
Kết nối SSH vào máy chủ Ubuntu của bạn và thực hiện các lệnh sau:

```bash
# 1. Cập nhật hệ điều hành
sudo apt update && sudo apt upgrade -y

# 2. Cài đặt Docker & Docker Compose
sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker

# 3. Tải mã nguồn Simply IT Community
sudo git clone https://github.com/takien26/Simply-it-community.git /opt/simply-it
sudo chown -R $USER:$USER /opt/simply-it
cd /opt/simply-it

# 4. Khởi chạy toàn bộ hệ thống bằng 1 lệnh duy nhất
sudo docker compose up -d --build

# 5. Mở cổng tường lửa (Firewall)
sudo ufw allow 3000/tcp
sudo ufw allow 3443/tcp
```
👉 Truy cập ngay qua trình duyệt:
* **HTTP (Mặc định)**: **`http://<IP-MÁY-CHỦ>:3000`**
* **HTTPS (Bảo mật SSL)**: **`https://<IP-MÁY-CHỦ>:3443`** *(Bấm "Nâng cao" -> "Tiếp tục" nếu trình duyệt hiện cảnh báo SSL tự ký)*

---

### 🛠️ Phương án 3B: Cài đặt Native trực tiếp trên Ubuntu (Không dùng Docker)

Nếu máy chủ của bạn cấu hình nhẹ và muốn tối ưu RAM tối đa:

```bash
# 1. Cài đặt Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git postgresql postgresql-contrib

# 2. Tạo Cơ sở dữ liệu và Phân quyền trong PostgreSQL
sudo -u postgres psql -c "CREATE DATABASE it_asset_db;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Admin@123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE it_asset_db TO postgres;"

# 3. Tải mã nguồn và cài thư viện
sudo git clone https://github.com/takien26/Simply-it-community.git /opt/simply-it
sudo chown -R $USER:$USER /opt/simply-it
cd /opt/simply-it
cp .env.example .env

# Chỉnh sửa file .env cho đúng mật khẩu vừa đặt
sed -i 's/password/Admin@123/g' .env

npm install
npx prisma db push
npm run seed
npm run build

# 4. Mở cổng tường lửa
sudo ufw allow 3001/tcp
sudo ufw allow 3443/tcp

# 5. Dùng PM2 để ứng dụng luôn chạy ngầm và tự bật lại khi khởi động lại server
sudo npm install -g pm2
pm2 start server.js --name "simply-it"
pm2 save
pm2 startup
```

---

## 🔑 THÔNG TIN ĐĂNG NHẬP MẶC ĐỊNH & CỔNG KẾT NỐI

Khi mở phần mềm lên lần đầu tiên, hãy sử dụng tài khoản Quản trị viên (Super Admin) sau để đăng nhập:

* 👤 **Tài khoản (Email):** `admin@company.com`
* 🔒 **Mật khẩu (Password):** `Admin@123`
* 🌐 **Cổng & Đường dẫn truy cập:**
  * **Trên Windows (.exe Portable):**
    * HTTP: **`http://localhost:3001`**
    * HTTPS: **`https://localhost:3443`**
  * **Trên Docker (Windows / Ubuntu):**
    * HTTP: **`http://localhost:3000`** *(hoặc `http://<IP-MÁY-CHỦ>:3000`)*
    * HTTPS: **`https://localhost:3443`** *(hoặc `https://<IP-MÁY-CHỦ>:3443`)*
  * *Lưu ý*: Với giao thức HTTPS, trình duyệt sẽ cảnh báo chứng chỉ số nội bộ (Self-signed Certificate). Bạn chỉ cần nhấp **"Nâng cao" (Advanced)** -> **"Tiếp tục truy cập" (Proceed)** là vào bình thường và toàn bộ đường truyền vẫn được mã hóa an toàn tuyệt đối.


> ⚠️ **LƯU Ý BẢO MẬT**: Ngay sau khi đăng nhập thành công, hãy vào mục **Cài đặt hệ thống > Đổi mật khẩu** để bảo vệ an toàn cho dữ liệu của bạn!

---

## ❓ XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Báo lỗi: "Port 3000 hoặc 3001 already in use" (Cổng mạng bị trùng)
* **Nguyên nhân**: Đang có một phần mềm khác (hoặc một bản Simply IT cũ) chạy ngầm chiếm cổng.
* **Cách khắc phục trên Windows**:
  * Mở PowerShell với quyền Admin và gõ:
    ```powershell
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force
    ```
  * Hoặc mở Task Manager > tìm tiến trình `Node.js JavaScript Runtime` hoặc `SimplyIT_Server.exe` rồi chọn **End Task**.

### 2. Báo lỗi: "Can't reach database server at localhost:5432"
* **Nguyên nhân**: Dịch vụ PostgreSQL chưa được bật hoặc sai mật khẩu trong file `.env`.
* **Cách khắc phục**:
  * Nhấn tổ hợp phím `Windows + R`, gõ `services.msc` rồi nhấn Enter.
  * Tìm dịch vụ có tên `postgresql...`, nhấp chuột phải chọn **Start** (hoặc **Restart**).
  * Kiểm tra lại mật khẩu trong file `.env` đã khớp với mật khẩu lúc bạn cài PostgreSQL chưa.

### 3. Docker báo lỗi: "Cannot connect to the Docker daemon"
* **Nguyên nhân**: Ứng dụng Docker Desktop chưa được mở lên.
* **Cách khắc phục**: Mở menu Start > gõ tìm **Docker Desktop** và nhấp mở ứng dụng. Chờ icon chú cá voi Docker ở góc màn hình dừng chuyển động là bạn có thể chạy lại lệnh `docker compose up -d`.

---

## 👨‍💻 TÁC GIẢ & HỖ TRỢ KỸ THUẬT

* 👤 **Tác giả phát triển**: **Tạ Trung Kiên**
* 📧 **Email**: `takien26@gmail.com`
* 🐙 **Mã nguồn chính thức (GitHub)**: [https://github.com/takien26/Simply-it-community](https://github.com/takien26/Simply-it-community)
* 👑 **Bản Enterprise**: Nếu doanh nghiệp của bạn cần các tính năng nâng cao (Sơ đồ mặt bằng văn phòng 2D, Tự động quét thiết bị mạng Auto-Discovery, Đợt kiểm kê tài sản chuyên sâu, Webhooks tích hợp, Đăng nhập tập trung SSO/LDAP), vui lòng liên hệ tác giả qua email trên để được hỗ trợ và cấp License bản quyền chính hãng.

---

## ☕ ỦNG HỘ / DONATE PHÁT TRIỂN DỰ ÁN

> **Lời ngỏ từ tác giả**:
> *SIMPLY IT Community Edition* được phát triển và đóng gói hoàn toàn miễn phí nhằm hỗ trợ cộng đồng Quản trị viên hệ thống (IT Admin), các doanh nghiệp vừa & nhỏ (SME) và các bạn sinh viên tiếp cận một giải pháp ITAM & Helpdesk chuẩn mực, hiện đại.
>
> Nếu bạn thấy phần mềm và tài liệu này hữu ích, giúp tiết kiệm thời gian và tối ưu công việc của bạn, hãy dành tặng tác giả một ly cà phê ấm lòng để tiếp thêm động lực nghiên cứu, bảo trì và phát triển thêm nhiều tính năng mới cho cộng đồng!

| Quét mã VietQR chuyển khoản nhanh | Thông tin tài khoản ngân hàng |
| :--- | :--- |
| ![Mã VietQR Ủng Hộ](./donate_qr.png) | 🏦 **Ngân hàng**: **BIDV** (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)<br><br>💳 **Số tài khoản**: `2141876442`<br><br>👤 **Chủ tài khoản**: **TA TRUNG KIEN**<br><br>📝 **Nội dung chuyển khoản**: `Ung ho Simply IT` *(hoặc lời nhắn gửi tùy tâm)* |

---
*Trân trọng cảm ơn sự đồng hành và ủng hộ quý báu của bạn dành cho dự án SIMPLY IT!*

