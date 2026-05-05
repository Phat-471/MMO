# VPS Deployment

This repo is set up to run in two modes:

- `APP_ENV=local` for local development
- `APP_ENV=vps` for production on a VPS

## Recommended layout

- `web`: Next.js on port `3000`
- `api`: NestJS on port `4000`
- `worker`: Node process for queue jobs
- `mysql`: MySQL 8+
- `redis`: Redis 7+

You can run MySQL and Redis from `docker-compose.yml`, or use managed services.

## Required env files

1. Copy `env/vps.env.example` to `env/vps.env`
2. Fill in real values:
   - `APP_URL`
   - `API_URL`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_SOCKET_URL`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `ENCRYPTION_KEY_BASE64`

## Install and prepare

```bash
pnpm install
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

If you already have data, skip `db:seed`.

## Build

Make sure the VPS shell has `APP_ENV=vps` available before build.

```bash
pnpm build
```

This will build:

- API
- Web
- Worker

## Start

After build, run each service:

```bash
pnpm --filter @mmo/api start
pnpm --filter @mmo/web start
pnpm --filter @mmo/worker start
```

## Reverse proxy

Use Nginx or Caddy so public traffic reaches the right service.

Suggested routes:

- `/` -> web on `3000`
- `/api` -> api on `4000`
- `/socket.io` -> api on `4000`

## Health checks

Use these after deployment:

- `GET /api/health`
- Admin `System -> Ket noi -> Test API`
- Admin `System -> Ket noi -> Test Socket`

## Notes

- Do not use `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` on VPS.
- Keep `DATABASE_URL` and `REDIS_URL` pointed at real services.
- If you move API to another domain, update both `API_URL` and `NEXT_PUBLIC_SOCKET_URL`.
