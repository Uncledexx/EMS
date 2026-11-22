import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, encrypt, parseId, verifyToken, staticToken, dynamicToken, currentStep, TokenResult } from "@/lib/crypto";
import { appendAudit } from "@/lib/audit";
import { getCalibration } from "@/lib/settings";

// Prototype patient access: the personal static token acts as the bearer credential.
// Replace with real login (e.g. NextAuth) before any real pilot.
export async function POST(req: Request) {
  const { token, action, profile } = await req.json(), cfg = await getCalibration();
  const u = await prisma.user.findUnique({ where: { id: parseId(String(token)) } });
  const v: TokenResult = u && u.status === "ACTIVE" ? verifyToken(token, u.tokenVersion, cfg.DYNAMIC_QR_REFRESH_SECONDS) : { ok: false, reason: "Invalid" };
  if (!u || !v.ok || v.kind !== "static") return NextResponse.json({ error: "Invalid or revoked token" }, { status: 403 });
  const self = `Self (${u.fullName})`;
  if (action === "revoke") {
    const n = await prisma.user.update({ where: { id: u.id }, data: { tokenVersion: { increment: 1 } } });
    await appendAudit({ responder: self, victim: u.id, action: "TOKEN_REVOKED", reason: "Patient revoked and regenerated token" });
    return NextResponse.json({ staticToken: staticToken(u.id, n.tokenVersion), dynamicToken: dynamicToken(u.id, currentStep(cfg.DYNAMIC_QR_REFRESH_SECONDS)), refresh: cfg.DYNAMIC_QR_REFRESH_SECONDS, profile: decrypt(u.vault), history: [] });
  }
  const p = decrypt(u.vault);
  if (action === "save") {
    for (const k of ["severe_allergies", "chronic_conditions", "active_medications"]) if (typeof profile?.[k] === "string") p[k] = profile[k].slice(0, 300);
    await prisma.user.update({ where: { id: u.id }, data: { vault: encrypt(p) } });
    await appendAudit({ responder: self, victim: u.id, action: "PROFILE_EDIT", reason: "Patient edited own profile" });
  }
  const logs = await prisma.auditLog.findMany({ where: { victimId: u.id }, orderBy: { seq: "desc" }, take: 50 });
  const names = new Map((await prisma.user.findMany({ where: { id: { in: logs.map((l) => l.responderId) } }, select: { id: true, fullName: true } })).map((x) => [x.id, x.fullName]));
  return NextResponse.json({
    staticToken: staticToken(u.id, u.tokenVersion), dynamicToken: dynamicToken(u.id, currentStep(cfg.DYNAMIC_QR_REFRESH_SECONDS)), refresh: cfg.DYNAMIC_QR_REFRESH_SECONDS, profile: p,
    history: logs.map((l) => ({ at: l.createdAt, who: names.get(l.responderId) ?? l.responderId, action: l.action, reason: l.reason })),
  });
}
