const API_BASE = (() => {
  const origin = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  // Em produção, VITE_API_BASE DEVE ser a URL completa do backend (ex: https://seu-backend.onrender.com).
  // Em desenvolvimento, pode ser '/api' para usar o proxy do Vite.
  // Remove a barra final se houver.
  return origin ? origin.replace(/\/$/, "") : "/api";
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

export function apiPost<T = any>(path: string, body?: any, method: "POST" | "PATCH" | "DELETE" = "POST") {
  return apiSend<T>(method, path, body);
}
