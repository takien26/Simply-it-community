#!/bin/sh
set -e

echo "🚀 [ITSM] Đang khởi động hệ thống Quản lý Dịch vụ & Tài sản IT..."

# Đợi PostgreSQL sẵn sàng
echo "⏳ Đang kiểm tra kết nối tới cơ sở dữ liệu PostgreSQL..."
until nc -z -v -w30 db 5432; do
  echo "⏳ Chờ Database khởi động (5432)..."
  sleep 2
done

echo "✅ Đã kết nối thành công tới Database!"

# Tự động đồng bộ Schema và tạo bảng nếu chưa có
echo "📦 Đang đồng bộ cấu trúc cơ sở dữ liệu (Prisma db push)..."
npx prisma db push --skip-generate

# Tự động khởi tạo dữ liệu ban đầu (Seed data)
echo "🌱 Đang kiểm tra và khởi tạo dữ liệu ban đầu (Seed data)..."
node prisma/seed.cjs || true

# Khởi chạy Next.js Production Server
echo "🌐 Khởi chạy máy chủ ứng dụng tại http://0.0.0.0:3000..."
exec npm run start -- -p 3000 -H 0.0.0.0
