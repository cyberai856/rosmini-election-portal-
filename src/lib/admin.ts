import { createHmac, timingSafeEqual } from "crypto";

const ADMIN_USERNAME = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "rosmini2026";
const SECRET = process.env.ADMIN_SESSION_SECRET ?? "rosmini-election-admin-2026";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function verifyAdminCredentials(username: string | undefined, password: string | undefined) {
  if (!username || !password) return false;
  const nameMatches = username.trim().toLowerCase() === ADMIN_USERNAME;
  let passwordMatches = false;
  const a = Buffer.from(password);
  const b = Buffer.from(ADMIN_PASSWORD);
  passwordMatches = a.length === b.length && timingSafeEqual(a, b);
  return nameMatches && passwordMatches;
}

export function createAdminToken(username: string) {
  const expires = Date.now() + TOKEN_TTL_MS;
  const payload = `${username}|${expires}`;
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return false;
  let payload: string;
  try {
    payload = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return false;
  }
  const [username, expiresRaw] = payload.split("|");
  if (username !== ADMIN_USERNAME) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires <= Date.now()) return false;
  const expected = createHmac("sha256", SECRET).update(payload).digest("hex");
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  return sigBuf.length === expectedBuf.length && timingSafeEqual(sigBuf, expectedBuf);
}
