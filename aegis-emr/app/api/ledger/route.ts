import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { verifyLedger, appendAudit } from "@/lib/audit";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [logs, alerts] = await Promise.all([prisma.auditLog.findMany({ orderBy: { seq: "desc" }, take: 200 }), prisma.anomalyAlert.findMany({ orderBy: { id: "desc" }, take: 50 })]);
  return NextResponse.json({ logs, alerts });
}
export async function POST(req: Request) { // verify integrity
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const r = await verifyLedger();
  await appendAudit({ responder: "IT Security Admin", action: "LEDGER_VERIFIED", reason: r.ok ? "OK" : "FAILED at #" + r.brokenAtSeq });
  return NextResponse.json(r);
}
