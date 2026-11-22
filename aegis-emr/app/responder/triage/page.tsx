"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
const NM: Record<string, string> = { full_name: "Full name", blood_type: "Blood type", severe_allergies: "Severe allergies", chronic_conditions: "Chronic conditions", active_medications: "Active medications", emergency_contacts: "Emergency contact", hmo_philhealth: "HMO / PhilHealth" };

export default function Triage() {
  const [nfc, setNfc] = useState(""), [pin, setPin] = useState(""), [ses, setSes] = useState<any>(null), [left, setLeft] = useState(0);
  const [tok, setTok] = useState(""), [gh, setGh] = useState<any>(null), [err, setErr] = useState(""), [cam, setCam] = useState(false);
  const [v, setV] = useState<any>({ category: "Medical" }), [rc, setRc] = useState<any>(null), sc = useRef<any>(null);

  useEffect(() => { if (!ses) return; const t = setInterval(() => { const s = Math.ceil((ses.exp - Date.now()) / 1000); if (s <= 0) { setSes(null); setGh(null); setErr("Session auto-locked."); } else setLeft(s); }, 1000); return () => clearInterval(t); }, [ses]);
  const start = async () => { try { setErr(""); setSes(await api("/api/session", "POST", { nfcUid: nfc, pin })); setGh(null); setRc(null); } catch (e: any) { setErr(e.message); } };
  const scan = async (t: string) => { try { setErr(""); setGh(await api("/api/scan", "POST", { token: t, ...ses })); setRc(null); } catch (e: any) { setErr(e.message); setGh(null); } };
  const readNfc = async () => { const R = (window as any).NDEFReader; if (!R) { setErr("Web NFC is not supported here (needs Chrome on Android over HTTPS). Use the simulate button."); return; } try { const r = new R(); await r.scan(); r.onreading = (e: any) => setNfc(String(e.serialNumber).toUpperCase()); } catch { setErr("NFC permission denied."); } };
  useEffect(() => {
    if (!cam || !ses) return; let on = true;
    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode"); if (!on) return;
      const s = new Html5Qrcode("reader"); sc.current = s;
      try { await s.start({ facingMode: "environment" }, { fps: 10, qrbox: 240 }, (txt: string) => { setCam(false); scan(txt); }, () => {}); }
      catch { setErr("Camera unavailable. It needs HTTPS and camera permission."); setCam(false); }
    })();
    return () => { on = false; const s = sc.current; sc.current = null; if (s) s.stop().then(() => s.clear()).catch(() => {}); };
  }, [cam, ses]); // eslint-disable-line
  const close = async () => { try { setErr(""); setRc(await api("/api/incident", "POST", { ...ses, victimId: gh.victimId, category: v.category, witnessId: v.witness, vitals: { bp: v.bp, hr: v.hr, spo2: v.spo2, glucose: v.glucose } })); } catch (e: any) { setErr(e.message); } };
  const f = (k: string, l: string) => <label>{l}<input value={v[k] || ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></label>;

  return (<>
    {err && <div className="card err">{err}</div>}
    <div className="card"><h2>Step 1 · Shift unlock and responder tap</h2>
      <label>Badge UID<input value={nfc} onChange={(e) => setNfc(e.target.value)} placeholder="04:A1:B2:C3" /></label>
      <label>Shift PIN (only needed once per shift)<input type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value)} /></label>
      <button onClick={() => setNfc("04:A1:B2:C3")} className="g">Simulate Head Nurse NFC Tap (fills seed UID)</button>
      <button onClick={readNfc} className="g">Use Web NFC</button><button onClick={start}>Unlock session</button>
      {ses && <p className="ok">Session active. Auto-lock in {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</p>}
    </div>
    {ses && <div className="card"><h2>Step 2 · Victim QR scan</h2>
      <button onClick={() => setCam(!cam)}>{cam ? "Stop camera" : "Scan with camera"}</button>{cam && <div id="reader" />}
      <label>Or paste the scanned token<input value={tok} onChange={(e) => setTok(e.target.value)} /></label><button className="g" onClick={() => scan(tok)}>Verify token</button>
    </div>}
    {ses && gh && <div className="card"><h2>Step 3 · Golden Hour critical screen</h2><div className="gh">
      {Object.entries(gh.fields).map(([k, val]: any) => <div key={k}><div className="k">{NM[k] || k}</div><div className="v">{k === "severe_allergies" || k === "chronic_conditions" ? <span className="pill">{val}</span> : val}</div></div>)}
      {gh.fields.emergency_contacts && <a href={"tel:" + (String(gh.fields.emergency_contacts).match(/\+[\d ]+/)?.[0] || "").replace(/ /g, "")}><button className="np">Call emergency contact</button></a>}
    </div>{gh.notifyFamily && <p className="mu">Family notification is enabled (email/SMS provider not connected yet).</p>}</div>}
    {ses && gh && <div className="card"><h2>Step 4 · On-scene vitals and FHIR endorsement</h2><div className="grid">
      {f("bp", "BP (mmHg, e.g. 120/80)")}{f("hr", "Heart rate")}{f("spo2", "SpO2 %")}{f("glucose", "Blood sugar mg/dL")}
      <label>Incident category<select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{["Medical", "Seizure", "Allergic reaction", "Injury", "Cardiac"].map((c) => <option key={c}>{c}</option>)}</select></label>{f("witness", "Witness ID")}</div>
      <button onClick={close}>Close incident and generate handoff</button></div>}
    {rc && <div className="card"><h2>Official Emergency Access Receipt</h2>
      <p>Reference <b>{rc.ref}</b><br />Time (UTC+8): {new Date(rc.at).toLocaleString("en-PH", { timeZone: "Asia/Manila", hour12: false })}<br />Patient: {rc.victim}<br />SHA-256 log hash: <code style={{ wordBreak: "break-all" }}>{rc.hash}</code></p>
      <p className="mu">Issued for emergency processing under RA 10173 Section 13(c).</p><button className="g np" onClick={() => window.print()}>Print ER handoff / save PDF</button>
      <h2>HL7 FHIR R4 payload</h2><pre>{JSON.stringify(rc.fhir, null, 1)}</pre></div>}
  </>);
}
