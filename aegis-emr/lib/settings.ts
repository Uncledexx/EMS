import { prisma } from "./db";
import { DEFAULT_CALIBRATION, Calibration } from "@/config/systemCalibration";
export async function getCalibration(): Promise<Calibration> {
  const row = await prisma.setting.findUnique({ where: { key: "calibration" } });
  return { ...DEFAULT_CALIBRATION, ...((row?.value as object) ?? {}) };
}
