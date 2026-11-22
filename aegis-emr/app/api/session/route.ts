import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPin, sessionSig } from "@/lib/crypto";
import { appendAudit } from "@/lib/audit";
import { getCalibration } from "@/lib/settings";

// Step 1: NFC badge UID (+ shift PIN once per shift) unlocks a short emergency session.
export async function POST(req: Request) {
  const { nfcUid, pin } = await req.json(), cfg = await getCalibration();
  const u = await prisma.user.findUnique({ where: { nfcUid } });
  if (!u || u.role !== "RESPONDER" || u.status !== "ACTIVE") {
    await appendAudit({ responder: nfcUid ?? "unknown", action: "BADGE_REJECTED", reason: "Unknown or suspended badge" });
    return NextResponse.json({ error: "Badge not authorized" }, { status: 403 });
  }
  const now = Date.now(), shiftOk = !!u.shiftValidUntil && u.shiftValidUntil.getTime() > now;
  if (!shiftOk && (!pin || hashPin(u.id, pin) !== u.pinHash)) {
    await appendAudit({ responder: u.id, action: "SHIFT_PIN_FAIL", reason: "Wrong PIN" });
    return NextResponse.json({ error: "Wrong shift PIN" }, { status: 401 });
  }
  if (!shiftOk) await prisma.user.update({ where: { id: u.id }, data: { shiftValidUntil: new Date(now + cfg.SHIFT_PIN_VALIDITY_HOURS * 36e5) } });
  const exp = now + cfg.RESPONDER_SESSION_TIMEOUT_SECONDS * 1000;
  await appendAudit({ responder: u.id, action: "RESPONDER_SESSION_START", reason: "NFC tap" });
  return NextResponse.json({ responderId: u.id, exp, sig: sessionSig(u.id, exp) });
}
