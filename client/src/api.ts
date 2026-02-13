// Em dev o Vite faz proxy de /api -> http://localhost:3001 (vite.config.ts).
// Em produção, defina VITE_API_BASE (ex.: https://seu-backend.onrender.com)
// ou deixe vazio para usar o mesmo domínio ("/api").
const API_BASE = (() => {
  const origin = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  const clean = (origin ?? "").replace(/\/$/, "");
  return clean ? `${clean}/api` : "/api";
})();

async function apiSend<T>(method: string, path: string, body?: any): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json as T;
}

export function apiGet<T>(path: string) {
  return apiSend<T>("GET", path);
}

export function apiPost<T = any>(path: string, body?: any) {
  return apiSend<T>("POST", path, body);
}

export function apiPut<T = any>(path: string, body?: any) {
  return apiSend<T>("PUT", path, body);
}

export function apiPatch<T = any>(path: string, body?: any) {
  return apiSend<T>("PATCH", path, body);
}

export function apiDelete<T = any>(path: string, body?: any) {
  return apiSend<T>("DELETE", path, body);
}
