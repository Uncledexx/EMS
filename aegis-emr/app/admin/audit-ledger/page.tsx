"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { useAdminKey } from "@/components/AdminKey";

export default function Ledger() {
  const [key, keyUi] = useAdminKey(), [d, setD] = useState<any>(null), [vr, setVr] = useState<any>(null), [err, setErr] = useState("");
  const load = async () => { try { setErr(""); setD(await api("/api/ledger", "GET", undefined, key)); } catch (e: any) { setErr(e.message); } };
  const verify = async () => { try { setVr(await api("/api/ledger", "POST", {}, key)); load(); } catch (e: any) { setErr(e.message); } };
  return (<>
    <div className="card"><h2>Hash-chained audit ledger</h2>{keyUi}<button onClick={load}>Load ledger</button><button className="g" onClick={verify}>Verify Ledger Integrity</button>
      {err && <p className="err">{err}</p>}{vr && <p className={vr.ok ? "ok" : "err"}>{vr.ok ? `All ${vr.entries} hashes recomputed. Ledger intact.` : `INTEGRITY FAILURE at entry #${vr.brokenAtSeq}.`}</p>}</div>
    {d && <><div className="card"><h2>Security anomaly alerts</h2>{d.alerts.length ? d.alerts.map((a: any) => <p key={a.id} className="err">⚠ {new Date(a.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila" })}: {a.message}</p>) : <p className="mu">None.</p>}</div>
      <div className="card tw"><table><tbody><tr><th>#</th><th>Time (UTC+8)</th><th>Action</th><th>Responder</th><th>Victim</th><th>Reason</th><th>Hash</th></tr>
        {d.logs.map((l: any) => <tr key={l.seq}><td>{l.seq}</td><td>{new Date(l.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", hour12: false })}</td><td>{l.action}</td><td>{l.responderId}</td><td>{l.victimId}</td><td>{l.reason}</td><td><code>{l.currentHash.slice(0, 12)}…</code></td></tr>)}</tbody></table></div></>}
  </>);
}
