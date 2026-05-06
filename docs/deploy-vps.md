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

1. Prisma CLI reads the repo-root `.env` when you run `pnpm db:*`.
2. Keep `.env` aligned with your VPS values, or copy the VPS env example into `.env`.
3. Copy `env/vps.env.example` to `env/vps.env`
4. If you do not have a domain, copy `env/vps-ip.env.example` to `env/vps.env` and replace the IP
5. Fill in real values:
   - `APP_URL`
   - `API_URL`
   - `API_ORIGIN`
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

For the web app itself, the recommended client API setup is:

- `NEXT_PUBLIC_API_URL=/api`
- `API_ORIGIN=http://127.0.0.1:4000`

## Health checks

Use these after deployment:

- `GET /api/health`
- Admin `System -> Ket noi -> Test API`
- Admin `System -> Ket noi -> Test Socket`

## Notes

- If you run by IP directly, use `http://<VPS_IP>:3000` for web. Keep the web client on `NEXT_PUBLIC_API_URL=/api` and let Next proxy `/api` to `API_ORIGIN=http://127.0.0.1:4000`.
- Use `http://<VPS_IP>:4000` only for socket and direct health checks if you have opened the port publicly.
- If your WPanel already created the MySQL user `mmo`, put that username into `DATABASE_URL` instead of `root`.
- Do not use `NEXT_PUBLIC_SOCKET_URL=http://localhost:4000` on VPS.
- Keep `DATABASE_URL` and `REDIS_URL` pointed at real services.
- If you move API to another domain, update both `API_URL`, `API_ORIGIN`, and `NEXT_PUBLIC_SOCKET_URL`.
