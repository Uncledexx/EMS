import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { decrypt, parseId, verifyToken, sessionValid } from "@/lib/crypto";
import { appendAudit } from "@/lib/audit";
import { getCalibration } from "@/lib/settings";

// Steps 2-3: verify the victim QR inside an active session, then return ONLY the Golden Hour fields.
export async function POST(req: Request) {
  const { token, responderId, exp, sig } = await req.json(), cfg = await getCalibration();
  if (!sessionValid(responderId, exp, sig)) return NextResponse.json({ error: "Session locked. Tap badge again." }, { status: 401 });

  const since = new Date(Date.now() - cfg.RATE_LIMIT_WINDOW_MINUTES * 60_000);
  await prisma.scanAttempt.create({ data: { responderId } });
  const n = await prisma.scanAttempt.count({ where: { responderId, createdAt: { gte: since } } });
  if (n > cfg.BREAK_GLASS_RATE_LIMIT_MAX_SCANS) {
    await prisma.anomalyAlert.create({ data: { message: `${n} scans in ${cfg.RATE_LIMIT_WINDOW_MINUTES} min by ${responderId}` } });
    await appendAudit({ responder: responderId, action: "RATE_LIMIT_ANOMALY", reason: `${n} scans` });
  }

  const victim = await prisma.user.findUnique({ where: { id: parseId(String(token)) } });
  let reason = "";
  let kind = "";
  if (!victim) reason = "Unknown ID";
  else if (victim.status !== "ACTIVE") reason = "Account not active";
  else {
    const r = verifyToken(token, victim.tokenVersion, cfg.DYNAMIC_QR_REFRESH_SECONDS);
    if (r.ok) kind = r.kind; else reason = r.reason;
  }
  if (!victim || reason) {
    await appendAudit({ responder: responderId, victim: victim?.id, action: "SCAN_REJECTED", reason });
    return NextResponse.json({ error: reason }, { status: 400 });
  }
  await appendAudit({ responder: responderId, victim: victim.id, action: "BREAK_GLASS_VIEW", reason: `QR verified (${kind})` });
  const profile = decrypt(victim.vault), fields: Record<string, string> = {};
  for (const k of cfg.GOLDEN_HOUR_VISIBLE_FIELDS) fields[k] = profile[k];
  return NextResponse.json({ victimId: victim.id, fields, notifyFamily: cfg.NOTIFY_FAMILY_ON_SCAN });
}
