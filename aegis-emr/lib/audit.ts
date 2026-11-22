import { prisma } from "./db";
import { entryHash } from "./crypto";
export const GENESIS = "0".repeat(64);

export async function appendAudit(a: { responder: string; victim?: string; action: string; reason?: string }) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(42)`; // serialize appends so the chain never forks
    const last = await tx.auditLog.findFirst({ orderBy: { seq: "desc" } });
    const prev = last?.currentHash ?? GENESIS, ts = new Date(), victim = a.victim ?? "-", reason = a.reason ?? "-";
    const currentHash = entryHash({ prev, responder: a.responder, victim, ts: ts.toISOString(), action: a.action, reason });
    return tx.auditLog.create({ data: { previousHash: prev, currentHash, responderId: a.responder, victimId: victim, action: a.action, reason, createdAt: ts } });
  });
}

export async function verifyLedger() {
  let prev = GENESIS;
  const rows = await prisma.auditLog.findMany({ orderBy: { seq: "asc" } });
  for (const r of rows) {
    const h = entryHash({ prev, responder: r.responderId, victim: r.victimId, ts: r.createdAt.toISOString(), action: r.action, reason: r.reason });
    if (r.previousHash !== prev || h !== r.currentHash) return { ok: false as const, brokenAtSeq: r.seq };
    prev = r.currentHash;
  }
  return { ok: true as const, entries: rows.length };
}
