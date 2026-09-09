@echo off
chcp 65001 > nul
color 0B
title SIMPLY IT - Tự Động Cập Nhật Phiên Bản Mới

echo ========================================================================
echo         🚀 SIMPLY IT COMMUNITY EDITION - CÔNG CỤ TỰ ĐỘNG CẬP NHẬT
echo ========================================================================
echo.
echo [!] Lưu ý quan trọng:
echo   - Toàn bộ cơ sở dữ liệu và cấu hình (.env) của bạn sẽ được giữ nguyên 100%.
echo   - Hãy chắc chắn bạn đã tắt server/ứng dụng đang chạy trước khi tiếp tục.
echo.
pause
echo.

:: 1. Kiểm tra Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [X] LỖI: Không tìm thấy Git trên máy tính của bạn!
    echo Vui lòng cài đặt Git tại https://git-scm.com/downloads rồi thử lại.
    echo Hoặc tham khảo file HUONG_DAN_CAP_NHAT.md để update bằng file ZIP.
    pause
    exit /b 1
)

:: 2. Kéo code mới từ GitHub
echo [1/4] Đang tải mã nguồn mới nhất từ GitHub (git pull)...
git pull origin main
if %ERRORLEVEL% neq 0 (
    color 0E
    echo [!] Cảnh báo: Có xung đột file hoặc mất kết nối mạng.
    echo Đang thử đặt lại các file code về trạng thái chuẩn từ GitHub...
    git reset --hard HEAD
    git pull origin main
)
echo [OK] Đã cập nhật mã nguồn mới thành công!
echo.

:: 3. Cập nhật thư viện
echo [2/4] Đang kiểm tra và cài đặt gói thư viện bổ sung (npm install)...
call npm install
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [X] LỖI: Cài đặt thư viện thất bại! Vui lòng kiểm tra kết nối mạng.
    pause
    exit /b 1
)
echo [OK] Cài đặt thư viện hoàn tất!
echo.

:: 4. Cập nhật cơ sở dữ liệu Prisma
echo [3/4] Đang đồng bộ cấu trúc cơ sở dữ liệu mới (npx prisma db push)...
call npx prisma db push
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [X] LỖI: Đồng bộ cơ sở dữ liệu thất bại! Hãy chắc chắn dịch vụ PostgreSQL đang chạy.
    pause
    exit /b 1
)
echo [OK] Cơ sở dữ liệu đã được cập nhật an toàn!
echo.

:: 5. Biên dịch ứng dụng Next.js
echo [4/4] Đang biên dịch bản chạy tối ưu (npm run build)...
call npm run build
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [X] LỖI: Biên dịch ứng dụng thất bại!
    pause
    exit /b 1
)

color 0A
echo.
echo ========================================================================
echo       🎉 CHÚC MỪNG! HỆ THỐNG ĐÃ CẬP NHẬT THÀNH CÔNG LÊN BẢN MỚI NHẤT!
echo ========================================================================
echo.
echo Bạn có thể khởi động lại phần mềm bằng cách:
echo   - Click đúp vào file SimplyIT_Server.exe (nếu dùng bản Portable)
echo   - Hoặc gõ lệnh: npm start
echo.
set /p START_NOW="Bạn có muốn khởi động server ngay bây giờ không? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo Đang khởi động Simply IT Server...
    start "" http://localhost:3001
    call npm start
)

pause