"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useAdminKey } from "@/components/AdminKey";

export default function People() {
  const [key, keyUi] = useAdminKey(), [list, setList] = useState<any[]>([]), [f, setF] = useState<any>({ role: "PATIENT" }), [msg, setMsg] = useState(""), [made, setMade] = useState<any>(null);
  const load = async () => { try { setList(await api("/api/users", "GET", undefined, key)); } catch (e: any) { setMsg(e.message); } };
  const add = async () => { try { setMsg(""); const r = await api("/api/users", "POST", { fullName: f.name, role: f.role, nfcUid: f.nfc || undefined, pin: f.pin || undefined,
      profile: { blood_type: f.bt, severe_allergies: f.al || "None known", chronic_conditions: f.co || "None known", active_medications: f.me || "None", emergency_contacts: f.ec, hmo_philhealth: f.hm } }, key); setMade(r); load(); } catch (e: any) { setMsg(e.message); } };
  const act = async (id: string, action: string) => { try { await api("/api/users", "PATCH", { id, action }, key); load(); } catch (e: any) { setMsg(e.message); } };
  const i = (k: string, l: string) => <label>{l}<input value={f[k] || ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label>;
  return (<>
    <div className="card"><h2>IT / HR dashboard</h2>{keyUi}<button className="g" onClick={load}>Load directory</button>{msg && <p className="err">{msg}</p>}</div>
    <div className="card"><h2>Onboard a person</h2><div className="grid">{i("name", "Full name")}
      <label>Role<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="PATIENT">Student / Employee</option><option value="RESPONDER">Authorized Responder</option><option value="OBSERVER">Teacher / Team Leader / Guard</option><option value="ADMIN">IT Security / Admin</option></select></label>
      {i("bt", "Blood type")}{i("al", "Severe allergies")}{i("co", "Chronic conditions")}{i("me", "Active medications")}{i("ec", "Emergency contact (name, relation, +63…)")}{i("hm", "HMO / PhilHealth")}
      {f.role === "RESPONDER" && <>{i("nfc", "NFC badge UID")}{i("pin", "4-digit shift PIN")}</>}</div><button onClick={add}>Add person</button>
      {made && <p className="ok">Created. Personal link: <code style={{ wordBreak: "break-all" }}>{typeof location !== "undefined" ? location.origin : ""}/patient/profile?t={made.staticQrToken}</code></p>}</div>
    <div className="card tw"><h2>Directory ({list.length})</h2><table><tbody><tr><th>Name</th><th>Role</th><th>Token</th><th>Status</th><th /></tr>
      {list.map((u) => <tr key={u.id}><td>{u.fullName}</td><td>{u.role}</td><td>v{u.tokenVersion}</td><td className={u.status === "ACTIVE" ? "ok" : "err"}>{u.status}</td>
        <td><button className="g" onClick={() => act(u.id, "revoke")}>Revoke token</button>{u.status === "ACTIVE" ? <><button className="g" onClick={() => act(u.id, "suspend")}>Suspend</button><button className="g" onClick={() => act(u.id, "deactivate")}>Deactivate</button></> : <button className="g" onClick={() => act(u.id, "reactivate")}>Reactivate</button>}</td></tr>)}</tbody></table></div>
  </>);
}
