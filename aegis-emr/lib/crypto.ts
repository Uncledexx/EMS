import crypto from "crypto";
const key = () => Buffer.from(process.env.ENCRYPTION_KEY!, "hex");
const mac = (s: string) => crypto.createHmac("sha256", process.env.QR_HMAC_SECRET!).update(s).digest("hex");
const eq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// AES-256-GCM for medical data at rest: base64(iv|tag|ciphertext)
export function encrypt(obj: unknown): string {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(JSON.stringify(obj), "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}
export function decrypt<T = Record<string, string>>(b64: string): T {
  const b = Buffer.from(b64, "base64"), d = crypto.createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
  d.setAuthTag(b.subarray(12, 28));
  return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8"));
}

// HMAC-SHA256 QR tokens
export const staticToken = (id: string, v: number) => `AEGIS.${id}.v${v}.${mac("S" + id + v).slice(0, 16)}`;
export const dynamicToken = (id: string, step: number) => `AEGIS-D.${id}.${step}.${mac("D" + id + step).slice(0, 12)}`;
export const currentStep = (sec: number) => Math.floor(Date.now() / (sec * 1000));
export const parseId = (t: string) => t.split(".")[1] || "";
export type TokenResult = { ok: true; kind: "static" | "dynamic" } | { ok: false; reason: string };
export function verifyToken(t: string, currentVersion: number, refreshSec: number): TokenResult {
  const p = t.split("."), id = p[1];
  if (!id) return { ok: false, reason: "Malformed token" };
  if (p[0] === "AEGIS") {
    const v = Number((p[2] || "").slice(1));
    if (!eq(p[3] || "", mac("S" + id + v).slice(0, 16))) return { ok: false, reason: "Tampered token (HMAC mismatch)" };
    if (v !== currentVersion) return { ok: false, reason: "Revoked token" };
    return { ok: true, kind: "static" };
  }
  if (p[0] === "AEGIS-D") {
    const s = Number(p[2]);
    if (!eq(p[3] || "", mac("D" + id + s).slice(0, 12))) return { ok: false, reason: "Tampered token (HMAC mismatch)" };
    if (Math.abs(currentStep(refreshSec) - s) > 1) return { ok: false, reason: "Expired dynamic QR" };
    return { ok: true, kind: "dynamic" };
  }
  return { ok: false, reason: "Unknown token format" };
}

// Responder PIN + stateless signed emergency session
export const hashPin = (id: string, pin: string) => mac("P" + id + pin);
export const sessionSig = (id: string, exp: number) => mac("SESS" + id + exp);
export const sessionValid = (id: string, exp: number, sig: string) => Date.now() < exp && eq(sig || "", sessionSig(id, exp));

// SHA-256 hash chain
export const entryHash = (e: { prev: string; responder: string; victim: string; ts: string; action: string; reason: string }) =>
  crypto.createHash("sha256").update(e.prev + e.responder + e.victim + e.ts + e.action + e.reason).digest("hex");
