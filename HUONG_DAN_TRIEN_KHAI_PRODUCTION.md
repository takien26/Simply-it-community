# 🚀 CẨM NANG TRIỂN KHAI MÁY CHỦ SẢN XUẤT (PRODUCTION DEPLOYMENT GUIDE)
> **Hệ thống Quản lý Tài sản IT & Service Desk Doanh nghiệp — Simply IT Community Edition (CE)**  
> *Phiên bản tài liệu: 2.0 (Cập nhật tháng 09/2026)*

---

## 📑 MỤC LỤC
1. [Yêu Cầu Phần Cứng & Môi Trường Máy Chủ](#1-yêu-cầu-phần-cứng--môi-trường-máy-chủ)
2. [Cài Đặt Cơ Sở Dữ Liệu PostgreSQL & Đổi Mật Khẩu An Toàn (Trọng tâm)](#2-cài-đặt-cơ-sở-dữ-liệu-postgresql--đổi-mật-khẩu-an-toàn)
3. [Thiết Lập Biến Môi Trường Sản Xuất (.env.production)](#3-thiết-lập-biến-môi-trường-sản-xuất)
4. [Triển Khai Ứng Dụng Chạy Nền 24/7 (Systemd / PM2 / Docker)](#4-triển-khai-ứng-dụng-chạy-nền-247)
5. [Cấu Hình Nginx Reverse Proxy & Chứng Chỉ Bảo Mật SSL HTTPS](#5-cấu-hình-nginx-reverse-proxy--chứng-chỉ-ssl-https)
6. [Thiết Lập Tự Động Sao Lưu CSDL Định Kỳ (Automated Backup)](#6-thiết-lập-tự-động-sao-lưu-csdl-định-kỳ)
7. [Checklist An Ninh Trước Khi Bàn Giao Vận Hành (Production Security Checklist)](#7-checklist-an-ninh-trước-khi-bàn-giao-vận-hành)

---

## 1. YÊU CẦU PHẦN CỨNG & MÔI TRƯỜNG MÁY CHỦ

Simply IT được tối ưu hóa trên nền tảng **Next.js Standalone (Node.js) + PostgreSQL**, kiến trúc cực kỳ nhẹ nhàng, tiêu thụ ít RAM và CPU:

| Quy mô doanh nghiệp | Số người dùng hoạt động | CPU (Cores) | RAM | Ổ cứng SSD/NVMe | Hệ điều hành đề xuất |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Quy mô Tiêu chuẩn** | **100 – 300 người** | **4 vCPU** | **8 GB** | **100 – 150 GB** | **Ubuntu Server 22.04 / 24.04 LTS** |
| **Quy mô Mở rộng** | **500 – 1,000+ người** | **8 vCPU** | **16 GB** | **250 – 500 GB** | **Ubuntu Server 24.04 LTS (Tách riêng DB)** |

> 💡 **Khuyến nghị:** Hệ điều hành **Ubuntu Server LTS** là lựa chọn tốt nhất để chạy ứng dụng 24/7 vì tính ổn định cao, bảo mật mạnh mẽ và tối ưu dung lượng RAM tốt hơn Windows Server.

---

## 2. CÀI ĐẶT CƠ SỞ DỮ LIỆU POSTGRESQL & ĐỔI MẬT KHẨU AN TOÀN

> ⚠️ **CẢNH BÁO BẢO MẬT:** Tuyệt đối **KHÔNG sử dụng mật khẩu mặc định** (`Admin@123`, `123456`, `postgres`, `password`) khi đưa lên môi trường sản xuất thật của công ty.

### Bước 2.1: Cài đặt PostgreSQL (Phiên bản 15 hoặc 16)
Trên máy chủ Ubuntu Server, mở terminal và chạy:
```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### Bước 2.2: Thiết lập Mật khẩu Mới Cực Kỳ An Toàn cho User PostgreSQL
1. Tạo một mật khẩu ngẫu nhiên mạnh gồm 20–32 ký tự (kết hợp chữ hoa, chữ thường, chữ số và ký tự đặc biệt, ví dụ: `Pg_Pr0d#2026_K9x$mQ`).
2. Mở trình quản trị dòng lệnh `psql` với quyền postgres:
   ```bash
   sudo -u postgres psql
   ```
3. Đổi mật khẩu cho user quản trị `postgres` bằng lệnh SQL:
   ```sql
   ALTER USER postgres WITH PASSWORD 'mat_khau_ngau_nhien_moi_rat_manh';
   ```
4. Tạo cơ sở dữ liệu mới chuyên dụng cho phần mềm:
   ```sql
   CREATE DATABASE it_asset_db OWNER postgres ENCODING 'UTF8';
   ```
5. *(Khuyến nghị nâng cao)* Tạo riêng một User ứng dụng độc lập thay vì dùng thẳng `postgres`:
   ```sql
   CREATE USER simply_app WITH PASSWORD 'mat_khau_ung_dung_sieu_bao_mat';
   GRANT ALL PRIVILEGES ON DATABASE it_asset_db TO simply_app;
   ```
6. Thoát khỏi psql:
   ```sql
   \q
   ```

### Bước 2.3: Tối ưu Connection Pool & Bộ nhớ PostgreSQL
Mở file cấu hình `/etc/postgresql/16/main/postgresql.conf`:
```ini
# Số kết nối tối đa từ ứng dụng
max_connections = 100

# Tối ưu RAM cho bộ nhớ đệm (Ví dụ máy có 8GB RAM thì cấp 2GB cho PostgreSQL)
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 32MB
maintenance_work_mem = 256MB
```
Khởi động lại PostgreSQL để áp dụng:
```bash
sudo systemctl restart postgresql
```

---

## 3. THIẾT LẬP BIẾN MÔI TRƯỜNG SẢN XUẤT

Tạo file `.env` tại thư mục gốc của dự án:
```bash
cp .env.example .env
nano .env
```

### Nội dung cấu hình mẫu cho Production:
```env
# ==========================================
# 1. KẾT NỐI CƠ SỞ DỮ LIỆU POSTGRESQL AN TOÀN
# ==========================================
# Cú pháp: postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DBNAME]?schema=public&connection_limit=25&pool_timeout=10
DATABASE_URL="postgresql://postgres:mat_khau_ngau_nhien_moi_rat_manh@localhost:5432/it_asset_db?schema=public&connection_limit=25&pool_timeout=10"

# ==========================================
# 2. KHÓA MÃ HÓA PHIÊN & AN NINH (BẮT BUỘC ĐỔI)
# ==========================================
# Chuỗi bí mật ký nhận JWT token (dùng chuỗi ngẫu nhiên tối thiểu 32 ký tự)
JWT_SECRET="Chuoi_Khoa_Bi_Mat_JWT_Sieu_Dai_Va_Ngau_Nhien_2026_XYZ!@#"

# Khóa bí mật bảo vệ các tác vụ tự động Cron (/api/cron/*)
CRON_SECRET="Khoa_Bao_Ve_Tien_Trinh_Cron_9988_Secret_Token!"

# Khóa Master mã hóa Két mật khẩu dự phòng (Password Vault AES-256)
MASTER_KEY="Khoa_Ma_Hoa_Ket_Mat_Khau_32_Ky_Tu_AES256"

# ==========================================
# 3. TÊN MIỀN & CỔNG MẠNG KÉP (DUAL-PORT)
# ==========================================
NODE_ENV="production"
PORT=3001                      # Cổng HTTP chính của ứng dụng
HTTPS_PORT=3443                # Cổng HTTPS bảo mật tích hợp sẵn chứng chỉ SSL tự ký
NEXT_PUBLIC_APP_URL="https://it.company.com"  # Tên miền truy cập chính thức của công ty
```

> 💡 **Giải thích về Cơ chế Cổng Mạng Kép (Dual-Port `3001` & `3443`):**
> - **Cổng HTTP (`PORT=3001`):** Cổng chạy dịch vụ web chính. Nếu bạn dùng Nginx làm Reverse Proxy, Nginx sẽ lắng nghe cổng `80`/`443` bên ngoài và chuyển tiếp (proxy) thẳng vào cổng `3001` này.
> - **Cổng HTTPS (`HTTPS_PORT=3443`):** Hệ thống tích hợp sẵn một web server HTTPS độc lập chạy trên cổng `3443` với chứng chỉ SSL tự động sinh (`localhost.crt`). Cổng này đặc biệt cần thiết cho **điện thoại di động (iOS Safari / Android Chrome)**: các trình duyệt di động bắt buộc phải có kết nối bảo mật HTTPS mới cho phép mở **Camera quét mã vạch và tem QR kiểm kê (`/scan`, `/assets/audit`)**. Nếu bạn không dùng Nginx mà chạy thẳng IP nội bộ, kỹ thuật viên chỉ cần mở `https://<IP-MÁY-CHỦ>:3443` trên điện thoại là camera hoạt động mượt mà ngay.

```env
# ==========================================
# 4. CẤU HÌNH GỬI MAIL THÔNG BÁO (SMTP)
# ==========================================
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_SECURE="false"
SMTP_USER="it-alert@company.com"
SMTP_PASS="MatKhauEmailAppPass123"
SMTP_FROM_EMAIL="it-alert@company.com"
SMTP_FROM_NAME="Simply IT Notification"
```

### Bảo mật phân quyền file `.env`:
```bash
# Chỉ tài khoản chạy dịch vụ mới có quyền đọc file .env
chmod 600 .env
```

---

## 4. TRIỂN KHAI ỨNG DỤNG CHẠY NỀN 24/7

### Cách 1: Triển khai Native với PM2 (Khuyên Dùng Trên Linux)
1. Cài đặt Node.js 20 hoặc 22 LTS:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2
   ```
2. Cài đặt thư viện & biên dịch sản xuất:
   ```bash
   npm install --production=false
   npx prisma generate
   npx prisma db push
   npm run build
   ```
3. Tạo file cấu hình `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [
       {
         name: 'simply-it',
         script: 'server.js',
         node_args: '--max-old-space-size=4096',
         env: {
           NODE_ENV: 'production',
           PORT: 3001,
         },
         instances: 1,
         autorestart: true,
         watch: false,
         max_memory_restart: '3G',
       },
     ],
   };
   ```
4. Khởi động và cấu hình tự chạy lại khi khởi động máy chủ:
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

---

### Cách 2: Triển khai bằng Docker Compose (Đóng Gói 1 Chạm)
Nếu bạn sử dụng Docker, chỉ cần tạo file `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: simply_it_db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: mat_khau_ngau_nhien_moi_rat_manh
      POSTGRES_DB: it_asset_db
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "127.0.0.1:5432:5432"

  app:
    build: .
    container_name: simply_it_app
    restart: always
    depends_on:
      - db
    environment:
      NODE_ENV: production
      DATABASE_URL: "postgresql://postgres:mat_khau_ngau_nhien_moi_rat_manh@db:5432/it_asset_db?schema=public&connection_limit=25"
      JWT_SECRET: "Chuoi_Khoa_Bi_Mat_JWT_Sieu_Dai_Va_Ngau_Nhien_2026_XYZ!@#"
      CRON_SECRET: "Khoa_Bao_Ve_Tien_Trinh_Cron_9988_Secret_Token!"
      NEXT_PUBLIC_APP_URL: "https://it.company.com"
    ports:
      - "127.0.0.1:3001:3001"
    volumes:
      - uploads_data:/app/public/uploads

volumes:
  pgdata:
  uploads_data:
```
Khởi chạy dịch vụ nền:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 5. CẤU HÌNH NGINX REVERSE PROXY & CHỨNG CHỈ SSL HTTPS

### Bước 5.1: Cài đặt Nginx
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Bước 5.2: Cấu hình Virtual Host
Tạo file cấu hình `/etc/nginx/sites-available/simply-it.conf`:
```nginx
server {
    listen 80;
    server_name it.company.com;

    client_max_body_size 50M;

    # Nén Gzip tối ưu tốc độ tải trang
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache file tĩnh uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:3001;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```
Kích hoạt cấu hình:
```bash
sudo ln -s /etc/nginx/sites-available/simply-it.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Bước 5.3: Cấp Chứng Chỉ SSL Miễn Phí (HTTPS)
```bash
sudo certbot --nginx -d it.company.com
```
*Certbot sẽ tự động cấu hình chứng chỉ HTTPS an toàn và tự động gia hạn khi sắp hết hạn.*

---

## 6. THIẾT LẬP TỰ ĐỘNG SAO LƯU CSDL ĐỊNH KỲ

Để bảo vệ 100% dữ liệu trước các sự cố phần cứng, hãy cài đặt lịch sao lưu tự động CSDL hàng ngày.

Tạo script sao lưu `/opt/backup_simply_it.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/var/backups/simply_it"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="db_backup_${TIMESTAMP}.sql.gz"

mkdir -p $BACKUP_DIR

# Xuất CSDL PostgreSQL và nén trực tiếp
PGPASSWORD="mat_khau_ngau_nhien_moi_rat_manh" pg_dump -U postgres -h localhost -d it_asset_db | gzip > "${BACKUP_DIR}/${FILENAME}"

# Tự động xóa các bản sao lưu cũ hơn 30 ngày để tiết kiệm dung lượng
find $BACKUP_DIR -type f -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Sao lưu hoàn tất: ${BACKUP_DIR}/${FILENAME}"
```
Phân quyền thực thi:
```bash
chmod +x /opt/backup_simply_it.sh
```

Mở crontab để chạy tự động lúc 01:00 sáng mỗi ngày:
```bash
sudo crontab -e
```
Thêm dòng sau vào cuối:
```cron
0 1 * * * /opt/backup_simply_it.sh >> /var/log/simply_it_backup.log 2>&1
```

---

## 7. CHECKLIST AN NINH TRƯỚC KHI BÀN GIAO VẬN HÀNH

Trước khi công bố đường link cho toàn thể cán bộ nhân viên công ty, IT Admin hãy rà soát danh sách kiểm tra sau:

- [ ] **Mật khẩu PostgreSQL:** Đã thay đổi thành mật khẩu ngẫu nhiên phức tạp, không còn dùng `Admin@123`.
- [ ] **File `.env`:** Đã phân quyền `chmod 600 .env` và nằm trong file `.gitignore`.
- [ ] **JWT_SECRET & CRON_SECRET:** Đã thay đổi bằng chuỗi ngẫu nhiên dài trên 32 ký tự.
- [ ] **SSL / HTTPS:** Truy cập qua `https://it.company.com` có ổ khóa xanh, tự động chuyển hướng từ HTTP sang HTTPS.
- [ ] **Mật khẩu Quản trị viên:** Đã đăng nhập tài khoản `admin@company.com` và đổi mật khẩu mới (thanh cảnh báo màu vàng đã tắt).
- [ ] **Sao lưu tự động:** Cron sao lưu CSDL hàng ngày đã hoạt động và tạo file nén thử nghiệm thành công.
- [ ] **Redirect URI trên Azure Portal:** Nếu dùng tính năng Đăng nhập SSO Microsoft 365, đã khai báo chính xác `https://it.company.com/api/auth/sso/ms365/callback` trên portal.azure.com.
