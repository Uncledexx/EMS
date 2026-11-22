export async function api(path: string, method = "GET", body?: any, key?: string) {
  const r = await fetch(path, { method, headers: { "content-type": "application/json", ...(key ? { "x-admin-key": key } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || r.statusText);
  return j;
}
