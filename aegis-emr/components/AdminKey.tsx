"use client";
import { useEffect, useState } from "react";
export function useAdminKey() {
  const [k, setK] = useState("");
  useEffect(() => setK(sessionStorage.getItem("ak") || ""), []);
  const ui = <label>Admin key<input type="password" value={k} onChange={(e) => { setK(e.target.value); sessionStorage.setItem("ak", e.target.value); }} /></label>;
  return [k, ui] as const;
}
