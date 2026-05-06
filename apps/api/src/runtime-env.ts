import fs from "node:fs";
import path from "node:path";

function resolveRuntimeEnvHelper() {
  const candidates = [
    path.resolve(process.cwd(), "env", "runtime-env.cjs"),
    path.resolve(process.cwd(), "..", "..", "env", "runtime-env.cjs"),
    path.resolve(__dirname, "..", "..", "..", "..", "env", "runtime-env.cjs"),
    path.resolve(__dirname, "..", "..", "..", "..", "..", "..", "env", "runtime-env.cjs")
  ];

  const helperPath = candidates.find((candidate) => fs.existsSync(candidate));
  if (!helperPath) {
    throw new Error(`Missing env/runtime-env.cjs. Checked: ${candidates.join(", ")}`);
  }

  return helperPath;
}

const runtimeEnv = require(resolveRuntimeEnvHelper());

export type RedisConnectionOptions = {
  host: string;
  port: number;
  password?: string;
  db?: number;
  lazyConnect?: boolean;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
  retryStrategy?: () => null;
  connectTimeout?: number;
};

type RuntimeEnvModule = {
  canConnectToRedis: (connection: RedisConnectionOptions, timeoutMs?: number) => Promise<boolean>;
  buildRedisConnection: (cwd: string, mode?: string) => RedisConnectionOptions;
  getRuntimeMode: () => string;
  loadRuntimeEnv: (cwd: string, mode?: string) => string | null;
  resolveRuntimeEnvPaths: (cwd: string, mode?: string) => string[];
};

export const {
  canConnectToRedis,
  buildRedisConnection,
  getRuntimeMode,
  loadRuntimeEnv,
  resolveRuntimeEnvPaths
} = runtimeEnv as RuntimeEnvModule;
