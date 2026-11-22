# AegisEMR on Vercel

1. Push this folder to a GitHub repo.
2. vercel.com > Add New Project > import the repo.
3. In the project: Storage > create a Postgres database (Neon) and connect it. This sets DATABASE_URL.
4. Settings > Environment Variables: ENCRYPTION_KEY (`openssl rand -hex 32`), QR_HMAC_SECRET (`openssl rand -hex 32`), ADMIN_API_KEY (any long random string).
5. Locally, once: copy `.env.example` to `.env`, fill it in, then `npm install && npx prisma db push && npm run seed`.
6. Redeploy. Open the https URL on your phone (HTTPS is what allows camera QR scanning and Web NFC on Chrome for Android).

API: POST /api/session {nfcUid,pin} -> POST /api/scan {token,responderId,exp,sig} -> Golden Hour fields. POST /api/users (header x-admin-key) onboards people.

## Pages
/responder/triage (badge + PIN, camera or pasted QR, Golden Hour, vitals, FHIR, receipt) · /patient/profile?t=<personal token> · /admin/people · /admin/audit-ledger · /settings/calibration.
Admin pages ask for ADMIN_API_KEY. Patient access uses the personal token as the credential (prototype only). Seed gives the nurse badge UID 04:A1:B2:C3 with PIN 1234; onboard patients in /admin/people to get their personal links.
