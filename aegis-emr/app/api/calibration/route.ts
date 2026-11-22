import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { getCalibration } from "@/lib/settings";
import { DEFAULT_CALIBRATION } from "@/config/systemCalibration";

export async function GET() { return NextResponse.json(await getCalibration()); }
export async function PUT(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const b = await req.json(), next: Record<string, unknown> = {};
  for (const k of Object.keys(DEFAULT_CALIBRATION) as (keyof typeof DEFAULT_CALIBRATION)[]) {
    const d = DEFAULT_CALIBRATION[k];
    if (typeof d === "number" && Number(b[k]) >= 1) next[k] = Number(b[k]);
    else if (typeof d === "boolean" && typeof b[k] === "boolean") next[k] = b[k];
    else if (k === "ORGANIZATION_MODE" && (b[k] === "SCHOOL" || b[k] === "WORKPLACE")) next[k] = b[k];
    else if (Array.isArray(d) && Array.isArray(b[k])) next[k] = b[k].filter((x: unknown) => (d as string[]).includes(x as string));
  }
  await prisma.setting.upsert({ where: { key: "calibration" }, update: { value: next as any }, create: { key: "calibration", value: next as any } });
  return NextResponse.json(await getCalibration());
}
