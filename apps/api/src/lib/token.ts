import crypto from "node:crypto";

export type TokenType = "access" | "refresh";

export interface TokenPayload {
  sub: string;
  type: TokenType;
  exp: number;
  iat: number;
  sessionId?: string;
  workspaceId?: string;
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function secretToKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function signPart(data: string, secret: string): string {
  return crypto.createHmac("sha256", secretToKey(secret)).update(data).digest("base64url");
}

export function signToken(payload: Omit<TokenPayload, "iat" | "exp"> & { ttlSeconds: number }, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: TokenPayload = {
    sub: payload.sub,
    type: payload.type,
    sessionId: payload.sessionId,
    workspaceId: payload.workspaceId,
    iat: now,
    exp: now + payload.ttlSeconds
  };
  const body = encode(tokenPayload);
  const signature = signPart(body, secret);
  return `${body}.${signature}`;
}

export function verifyToken(token: string, secret: string): TokenPayload {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    throw new Error("Token không hợp lệ.");
  }

  const expected = signPart(body, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) {
    throw new Error("Token không hợp lệ.");
  }
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error("Token không hợp lệ.");
  }

  const payload = decode<TokenPayload>(body);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("Token đã hết hạn.");
  }

  return payload;
}

export function bearerToken(headerValue?: string | null): string | null {
  if (!headerValue) {
    return null;
  }

  const [scheme, token] = headerValue.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}
