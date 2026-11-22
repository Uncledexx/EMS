"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/client";

export default function Patient() {
  const [tok, setTok] = useState(""), [d, setD] = useState<any>(null), [qd, setQd] = useState(""), [qs, setQs] = useState(""), [msg, setMsg] = useState(""), [ed, setEd] = useState<any>({});
  const load = async (t: string, body: any = {}) => {
    try { const r = await api("/api/me", "POST", { token: t, ...body }); setD(r); setTok(r.staticToken); setEd(r.profile);
      setQd(await QRCode.toDataURL(r.dynamicToken, { width: 220 })); setQs(await QRCode.toDataURL(r.staticToken, { width: 220 }));
      setMsg(body.action === "revoke" ? "Old QR revoked. Your new personal token is in the box above; save it." : body.action === "save" ? "Saved (encrypted)." : ""); }
    catch (e: any) { setMsg(e.message); }
  };
  useEffect(() => { const t = new URLSearchParams(location.search).get("t"); if (t) { setTok(t); load(t); } }, []); // eslint-disable-line
  useEffect(() => { if (!d) return; const i = setInterval(async () => { try { const r = await api("/api/me", "POST", { token: tok }); setQd(await QRCode.toDataURL(r.dynamicToken, { width: 220 })); } catch {} }, d.refresh * 1000); return () => clearInterval(i); }, [d, tok]);
  const f = (k: string, l: string) => <label>{l}<input value={ed[k] || ""} onChange={(e) => setEd({ ...ed, [k]: e.target.value })} /></label>;
  return (<>
    <div className="card"><label>Your personal token (IT/HR gives you this, or open your personal link)<input value={tok} onChange={(e) => setTok(e.target.value)} /></label><button onClick={() => load(tok)}>Open my profile</button>{msg && <p className={d ? "ok" : "err"}>{msg}</p>}</div>
    {d && <>
      <div className="grid"><div className="card"><h2>Dynamic QR (refreshes every {d.refresh}s)</h2>{qd && <img src={qd} alt="dynamic QR" />}</div>
        <div className="card"><h2>Static printable ID QR</h2>{qs && <img src={qs} alt="static QR" />}<p className="mu">Lost your card?</p><button className="d" onClick={() => confirm("Revoke the old QR and issue a new one?") && load(tok, { action: "revoke" })}>Revoke and Regenerate ID Token</button></div></div>
      <div className="card"><h2>My Golden Hour medical profile</h2><p className="mu">{d.profile.full_name} · {d.profile.blood_type} · {d.profile.hmo_philhealth}</p>
        {f("severe_allergies", "Severe allergies")}{f("chronic_conditions", "Chronic conditions")}{f("active_medications", "Active medications")}<button onClick={() => load(tok, { action: "save", profile: ed })}>Save</button></div>
      <div className="card"><h2>Privacy access history</h2><div className="tw"><table><tbody><tr><th>When (UTC+8)</th><th>Who</th><th>Action</th><th>Reason</th></tr>
        {d.history.map((h: any, i: number) => <tr key={i}><td>{new Date(h.at).toLocaleString("en-PH", { timeZone: "Asia/Manila", hour12: false })}</td><td>{h.who}</td><td>{h.action}</td><td>{h.reason}</td></tr>)}</tbody></table></div></div></>}
  </>);
}
