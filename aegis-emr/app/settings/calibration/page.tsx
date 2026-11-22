"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useAdminKey } from "@/components/AdminKey";
const NUM = ["RESPONDER_SESSION_TIMEOUT_SECONDS", "SHIFT_PIN_VALIDITY_HOURS", "DYNAMIC_QR_REFRESH_SECONDS", "BREAK_GLASS_RATE_LIMIT_MAX_SCANS", "RATE_LIMIT_WINDOW_MINUTES"];
const FIELDS = ["full_name", "blood_type", "severe_allergies", "chronic_conditions", "active_medications", "emergency_contacts", "hmo_philhealth"];

export default function Calibration() {
  const [key, keyUi] = useAdminKey(), [c, setC] = useState<any>(null), [msg, setMsg] = useState("");
  useEffect(() => { api("/api/calibration").then(setC).catch((e) => setMsg(e.message)); }, []);
  const save = async () => { try { setC(await api("/api/calibration", "PUT", c, key)); setMsg("Saved. Applies to the next request."); } catch (e: any) { setMsg(e.message); } };
  if (!c) return <div className="card">Loading… {msg}</div>;
  return (<div className="card"><h2>System calibration</h2>{keyUi}
    <label>ORGANIZATION_MODE<select value={c.ORGANIZATION_MODE} onChange={(e) => setC({ ...c, ORGANIZATION_MODE: e.target.value })}><option>SCHOOL</option><option>WORKPLACE</option></select></label>
    <div className="grid">{NUM.map((k) => <label key={k}>{k}<input type="number" min={1} value={c[k]} onChange={(e) => setC({ ...c, [k]: Number(e.target.value) })} /></label>)}</div>
    {["NOTIFY_FAMILY_ON_SCAN", "REQUIRE_WITNESS_ID_ON_CLOSURE"].map((k) => <label key={k}><input type="checkbox" checked={c[k]} onChange={(e) => setC({ ...c, [k]: e.target.checked })} />{k}</label>)}
    <p className="mu">GOLDEN_HOUR_VISIBLE_FIELDS</p>{FIELDS.map((k) => <label key={k}><input type="checkbox" checked={c.GOLDEN_HOUR_VISIBLE_FIELDS.includes(k)} onChange={(e) => setC({ ...c, GOLDEN_HOUR_VISIBLE_FIELDS: e.target.checked ? [...c.GOLDEN_HOUR_VISIBLE_FIELDS, k] : c.GOLDEN_HOUR_VISIBLE_FIELDS.filter((x: string) => x !== k) })} />{k}</label>)}
    <button onClick={save}>Save</button>{msg && <p className="mu">{msg}</p>}</div>);
}
