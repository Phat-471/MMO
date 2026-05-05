import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY_BASE64;
  if (!raw) {
    throw new Error("Thieu bien moi truong ENCRYPTION_KEY_BASE64.");
  }

  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY_BASE64 phai giai ma ra dung 32 byte.");
  }

  return key;
}

export function decryptSecret(payload: string): string {
  if (!payload) {
    return "";
  }

  try {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch (error) {
    console.error("Giai ma secret that bai:", error);
    return "";
  }
}
