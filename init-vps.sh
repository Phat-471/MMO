#!/bin/bash

echo "🚀 Bắt đầu quá trình thiết lập hệ thống MMO..."

# 1. Cập nhật hệ thống và cài đặt cơ bản
echo "📦 1. Cài đặt NodeJS, Git, pnpm, pm2..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
sudo npm install -g pnpm pm2

# 2. Kiểm tra file .env
if [ ! -f ".env" ]; then
    echo "📄 2. Khởi tạo file .env..."
    cp .env.example .env
    echo "⚠️  Lưu ý: Bạn cần mở file .env để sửa DATABASE_URL trước khi chạy tiếp!"
fi

# 3. Cài đặt thư viện
echo "🛠️ 3. Cài đặt thư viện (pnpm install)..."
pnpm install

# 4. Build dự án
echo "🏗️ 4. Đang Build hệ thống (Turbo)..."
pnpm build

# 5. Cập nhật Database
echo "🗄️ 5. Đang cập nhật Database (Prisma)..."
pnpm db:deploy

# 6. Khởi chạy với PM2
echo "🔥 6. Khởi chạy dịch vụ..."
pm2 delete all 2>/dev/null
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ HOÀN TẤT! Hệ thống đã được kích hoạt."
echo "👉 Dùng lệnh 'pm2 status' để xem trạng thái."
echo "👉 Dùng lệnh 'pm2 logs' để xem nhật ký hệ thống."
