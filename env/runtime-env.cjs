const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

function resolveRepoRoot(cwd) {
  if (fs.existsSync(path.join(cwd, "env"))) {
    return cwd;
  }

  const parentRoot = path.resolve(cwd, "..", "..");
  if (fs.existsSync(path.join(parentRoot, "env"))) {
    return parentRoot;
  }

  return cwd;
}

function getRuntimeMode() {
  const appEnv = String(process.env.APP_ENV || "").toLowerCase();
  return appEnv === "vps" || appEnv === "production" ? "vps" : "local";
}

function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function resolveRuntimeEnvPaths(cwd, mode = getRuntimeMode()) {
  const root = resolveRepoRoot(cwd);
  const envDir = path.join(root, "env");
  const localPath = path.join(envDir, "local.env");
  const vpsPath = path.join(envDir, "vps.env");
  const legacyPath = path.join(root, ".env");

  if (mode === "vps") {
    return [vpsPath];
  }

  return [localPath, legacyPath];
}

function loadRuntimeEnv(cwd, mode = getRuntimeMode()) {
  const envPaths = resolveRuntimeEnvPaths(cwd, mode);
  let loadedPath = null;

  for (const filePath of envPaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const values = parseEnvFile(filePath);
    for (const [key, value] of Object.entries(values)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }

    loadedPath = filePath;
    break;
  }

  if (mode === "vps" && !loadedPath) {
    throw new Error(
      "Missing env/vps.env. Copy env/vps.env.example to env/vps.env on the VPS."
    );
  }

  return loadedPath;
}

function buildRedisConnection(cwd, mode = getRuntimeMode()) {
  const connection = {
    host: "127.0.0.1",
    port: 6379
  };

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const parsed = new URL(redisUrl);
    connection.host = parsed.hostname;
    connection.port = Number(parsed.port || 6379);
    if (parsed.password) {
      connection.password = parsed.password;
    }
    const db = Number(parsed.pathname.replace("/", "") || 0);
    if (!Number.isNaN(db)) {
      connection.db = db;
    }
  }

  if (mode === "local") {
    return {
      ...connection,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 2000
    };
  }

  return connection;
}

function canConnectToRedis(connection, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: connection.host,
      port: connection.port
    });

    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

module.exports = {
  canConnectToRedis,
  buildRedisConnection,
  getRuntimeMode,
  loadRuntimeEnv,
  resolveRuntimeEnvPaths
};
