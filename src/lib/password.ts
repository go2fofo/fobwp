import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/** 使用 scrypt 生成带盐的密码哈希，格式：salt:hash */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** 校验密码是否匹配存储的哈希 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const target = Buffer.from(hash, "hex");
  return (
    candidate.length === target.length && timingSafeEqual(candidate, target)
  );
}
