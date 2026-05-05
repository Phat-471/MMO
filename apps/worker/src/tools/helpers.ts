export function parseOptions<T extends Record<string, unknown>>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return {} as T;
  }
}

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

export function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function parseString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function buildUrl(base: string, path: string): string {
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}
