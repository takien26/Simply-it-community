#!/bin/bash
# ========================================================================
#       🚀 SIMPLY IT COMMUNITY EDITION - SCRIPT TỰ ĐỘNG CẬP NHẬT (LINUX)
# ========================================================================

set -e

echo "========================================================================"
echo "        🚀 SIMPLY IT COMMUNITY EDITION - BẮT ĐẦU CẬP NHẬT MÃ NGUỒN"
echo "========================================================================"
echo ""

# Kiểm tra Docker hay Native
if [ -f "docker-compose.yml" ] && command -v docker &> /dev/null && docker compose ps &> /dev/null; then
    echo "🐳 Phát hiện hệ thống đang chạy qua Docker!"
    echo "[1/2] Đang kéo mã nguồn mới nhất từ GitHub..."
    git pull origin main
    echo "[2/2] Đang build lại và khởi động lại Docker containers..."
    docker compose up -d --build
    echo ""
    echo "🎉 Cập nhật Docker thành công!"
    exit 0
fi

echo "🐧 Cập nhật hệ thống chạy Native (Node.js)..."

# 1. Pull code mới
echo "[1/4] Kéo mã nguồn mới nhất từ GitHub..."
git pull origin main

# 2. Cài đặt thư viện mới
echo "[2/4] Cập nhật thư viện (npm install)..."
npm install

# 3. Đồng bộ cơ sở dữ liệu
echo "[3/4] Cập nhật cấu trúc database (npx prisma db push)..."
npx prisma db push

# 4. Biên dịch Next.js
echo "[4/4] Biên dịch ứng dụng (npm run build)..."
npm run build

# 5. Khởi động lại PM2 nếu có
if command -v pm2 &> /dev/null; then
    echo "🔄 Khởi động lại dịch vụ PM2..."
    pm2 restart simply-it || pm2 restart all
fi

echo ""
echo "🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT LÊN PHIÊN BẢN MỚI NHẤT THÀNH CÔNG!"