export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
}

export function parseProxyString(proxyStr: string): ProxyConfig | null {
  if (!proxyStr) return null;
  
  const parts = proxyStr.split(":");
  if (parts.length < 2) return null;

  return {
    host: parts[0],
    port: parseInt(parts[1], 10),
    username: parts[2] || undefined,
    password: parts[3] || undefined,
  };
}

export function getProxyAuthHeader(config: ProxyConfig): string | null {
  if (!config.username || !config.password) return null;
  const auth = Buffer.from(`${config.username}:${config.password}`).toString("base64");
  return `Basic ${auth}`;
}
