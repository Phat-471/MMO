import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getRuntimeMode, loadRuntimeEnv } = require("../../env/runtime-env.cjs");

loadRuntimeEnv(process.cwd(), getRuntimeMode());

function resolveApiOrigin() {
  const raw = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
  try {
    const parsed = new URL(raw, "http://localhost:4000");
    return `${parsed.origin}`;
  } catch {
    return "http://localhost:4000";
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${resolveApiOrigin()}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
