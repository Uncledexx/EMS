import { PrismaClient } from "@prisma/client";
import { encrypt, hashPin } from "../lib/crypto";
const prisma = new PrismaClient();
(async () => {
  const nurse = "seed-nurse-1";
  await prisma.user.upsert({ where: { id: nurse }, update: {}, create: { id: nurse, fullName: "Liza Mendoza (Head Nurse)", role: "RESPONDER", nfcUid: "04:A1:B2:C3", pinHash: hashPin(nurse, "1234"), vault: encrypt({ full_name: "Liza Mendoza" }) } });
  const p = [["Maria Clara Santos","O+","Penicillin (anaphylaxis)","Type 1 diabetes","Insulin glargine 18 units nightly","Rosario Santos (mother) +63 917 555 0142","PhilHealth PH-0000-1111-2222"],
             ["Jose Ramon Dela Cruz","A-","Bee sting (anaphylaxis)","Asthma","Salbutamol inhaler as needed","Ramon Dela Cruz (father) +63 918 555 0177","Maxicare MX-445-2210"]];
  for (const [i, r] of p.entries()) await prisma.user.upsert({ where: { id: `seed-patient-${i + 1}` }, update: {}, create: { id: `seed-patient-${i + 1}`, fullName: r[0], role: "PATIENT",
    vault: encrypt({ full_name: r[0], blood_type: r[1], severe_allergies: r[2], chronic_conditions: r[3], active_medications: r[4], emergency_contacts: r[5], hmo_philhealth: r[6] }) } });
  console.log("seeded. NFC uid 04:A1:B2:C3, PIN 1234");
})().finally(() => prisma.$disconnect());
