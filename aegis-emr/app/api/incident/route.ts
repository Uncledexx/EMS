import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sessionValid } from "@/lib/crypto";
import { appendAudit } from "@/lib/audit";
import { getCalibration } from "@/lib/settings";

// Step 4: close the incident, store vitals, return FHIR R4 bundle + receipt data.
export async function POST(req: Request) {
  const b = await req.json(), cfg = await getCalibration();
  if (!sessionValid(b.responderId, b.exp, b.sig)) return NextResponse.json({ error: "Session locked. Tap badge again." }, { status: 401 });
  if (cfg.REQUIRE_WITNESS_ID_ON_CLOSURE && !String(b.witnessId || "").trim()) return NextResponse.json({ error: "Witness ID is required" }, { status: 400 });
  const victim = await prisma.user.findUnique({ where: { id: b.victimId } });
  if (!victim) return NextResponse.json({ error: "Unknown victim" }, { status: 404 });
  const o = (code: string, name: string, val: any, unit: string) => val ? [{ resource: { resourceType: "Observation", status: "final", code: { coding: [{ system: "http://loinc.org", code, display: name }] }, subject: { reference: "Patient/" + victim.id }, valueQuantity: { value: Number(val), unit } } }] : [];
  const vt = b.vitals || {};
  const fhir = { resourceType: "Bundle", type: "collection", entry: [
    { resource: { resourceType: "Patient", id: victim.id, name: [{ text: victim.fullName }] } },
    { resource: { resourceType: "Encounter", status: "finished", class: { code: "EMER" }, type: [{ text: String(b.category || "Medical") }] } },
    ...o("8480-6", "Systolic BP", String(vt.bp || "").split("/")[0], "mm[Hg]"), ...o("8867-4", "Heart rate", vt.hr, "/min"), ...o("59408-5", "SpO2", vt.spo2, "%"), ...o("2339-0", "Glucose", vt.glucose, "mg/dL") ] };
  const log = await appendAudit({ responder: b.responderId, victim: victim.id, action: "INCIDENT_CLOSED", reason: `${b.category} | witness ${b.witnessId || "none"}` });
  const inc = await prisma.incident.create({ data: { victimId: victim.id, responderId: b.responderId, category: String(b.category || "Medical"), witnessId: b.witnessId || null, vitals: vt, fhir, logHash: log.currentHash } });
  return NextResponse.json({ ref: inc.id, at: log.createdAt, hash: log.currentHash, victim: victim.fullName, fhir });
}
