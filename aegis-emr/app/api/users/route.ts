import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt, hashPin, staticToken } from "@/lib/crypto";
import { appendAudit } from "@/lib/audit";

// IT/HR onboarding. Guarded by ADMIN_API_KEY until real login + RBAC is added.
export async function POST(req: Request) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_API_KEY) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json();
  if (!b.fullName || !b.role) return NextResponse.json({ error: "fullName and role required" }, { status: 400 });
  const id = crypto.randomUUID();
  const u = await prisma.user.create({ data: {
    id, fullName: b.fullName, role: b.role, vault: encrypt({ full_name: b.fullName, ...b.profile }),
    nfcUid: b.nfcUid ?? null, pinHash: b.pin ? hashPin(id, b.pin) : null } });
  await appendAudit({ responder: "IT/HR Admin", victim: u.id, action: "USER_ONBOARDED", reason: `${b.role}: ${b.fullName}` });
  return NextResponse.json({ id: u.id, staticQrToken: staticToken(u.id, u.tokenVersion) });
}

import { isAdmin } from "@/lib/admin";
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await prisma.user.findMany({ select: { id: true, fullName: true, role: true, status: true, tokenVersion: true }, orderBy: { createdAt: "asc" } }));
}
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, action } = await req.json();
  const data = action === "revoke" ? { tokenVersion: { increment: 1 } } : { status: action === "reactivate" ? "ACTIVE" as const : action === "suspend" ? "SUSPENDED" as const : "DEACTIVATED" as const };
  const u = await prisma.user.update({ where: { id }, data });
  await appendAudit({ responder: "IT/HR Admin", victim: id, action: "USER_" + String(action).toUpperCase(), reason: u.fullName });
  return NextResponse.json({ ok: true });
}
