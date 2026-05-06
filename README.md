# Nền tảng MMO SaaS - Hệ thống Quản trị & Tự động hóa

Dự án này là một nền tảng SaaS toàn diện để quản lý tài khoản, tác vụ và thu thập dữ liệu MMO trên các nền tảng như Facebook và TikTok.

## 🏗 Kiến trúc hệ thống
- **Web App**: Next.js (Tailwind CSS, Glassmorphism UI)
- **API Server**: NestJS (REST API, JWT Auth)
- **Worker**: Node.js (Xử lý tác vụ nền với BullMQ)
- **Database**: MySQL (Prisma ORM)
- **Queue**: Redis (BullMQ)

## 🛠 Yêu cầu hệ thống
- **Node.js**: v20+
- **PNPM**: v9+ (Khuyên dùng v10)
- **MySQL**: 8.0+
- **Redis**: 6.0+

## 🚀 Hướng dẫn chạy dự án

### 1. Cài đặt Dependencies
```bash
pnpm install
```

### 2. Cấu hình Biến môi trường
Tạo file `.env` tại thư mục gốc (nếu chưa có) và cấu hình các thông số:
- `DATABASE_URL`: Đường dẫn kết nối MySQL.
- `REDIS_URL`: Đường dẫn kết nối Redis.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`: Khóa bí mật cho Auth.
- `ENCRYPTION_KEY_BASE64`: Khóa mã hóa dữ liệu nhạy cảm (AES-256).

### 3. Chuẩn bị Cơ sở dữ liệu
```bash
# Đẩy schema lên database
pnpm exec prisma db push

# Tạo dữ liệu mẫu (Gói cước, Công cụ mẫu, Tài khoản Admin)
pnpm db:seed
```
*Tài khoản Admin mặc định (nếu seed):*
- Email: `admin@mmo.local`
- Password: `12345678`

### 4. Chạy dự án (Development)
Sử dụng Turbo để chạy tất cả các ứng dụng cùng lúc:
```bash
pnpm dev
```
Hoặc chạy từng module riêng lẻ:
- **API**: `pnpm --filter @mmo/api dev` (Cổng 4000)
- **Web**: `pnpm --filter @mmo/web dev` (Cổng 3000)
- **Worker**: `pnpm --filter @mmo/worker dev`

## 📊 Các tính năng chính
- **Quản lý tài khoản**: Lưu trữ mã hóa Cookie, Proxy, 2FA.
- **Tự động hóa**: Đặt lịch chạy (Cron), Hủy tác vụ, Quản lý trạng thái.
- **Dữ liệu**: Xem và xuất JSON dữ liệu đã thu thập (Data Snapshots).
- **Billing**: Giới hạn hạn mức (Quota) theo gói dịch vụ (Free/Starter/Pro).
- **Thông báo**: Cảnh báo lỗi, hoàn tất tác vụ hoặc hết hạn mức theo thời gian thực.

## 📁 Cấu trúc thư mục
- `apps/api`: NestJS Server.
- `apps/web`: Next.js Frontend.
- `apps/worker`: Node.js Worker xử lý job.
- `prisma`: Database schema và seeds.
- `packages/config`: Cấu hình dùng chung (Eslint, TSConfig).
## Configuration

- Local env: copy `env/local.env.example` to `env/local.env`
- VPS env: copy `env/vps.env.example` to `env/vps.env`
- VPS by IP: copy `env/vps-ip.env.example` to `env/vps.env` and replace the IP/ports
- Web local: `apps/web/.env.local`
- Web production: `apps/web/.env.production`
- Select the backend mode with `APP_ENV=local` or `APP_ENV=vps`
- VPS deployment guide: see [`docs/deploy-vps.md`](docs/deploy-vps.md)
