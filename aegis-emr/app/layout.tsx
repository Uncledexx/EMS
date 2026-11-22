import "./globals.css";
export const metadata = { title: "AegisEMR", description: "Break-glass emergency medical records" };
export default function Root({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1" /></head><body>
    <nav><a href="/responder/triage">Responder Triage</a><a href="/patient/profile">My Profile</a><a href="/admin/people">IT / HR</a><a href="/admin/audit-ledger">Audit Ledger</a><a href="/settings/calibration">Calibration</a></nav>
    <main>{children}</main></body></html>);
}
