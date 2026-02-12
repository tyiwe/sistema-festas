// Em dev o Vite faz proxy de /api -> http://localhost:3001 (vite.config.ts).
// Em produção, defina VITE_API_BASE (ex.: https://seu-backend.onrender.com)
// ou deixe vazio para usar o mesmo domínio ("/api").
const API_BASE = (() => {
  const origin = (import.meta as any).env?.VITE_API_BASE as string | undefined;
  const clean = (origin ?? "").replace(/\/$/, "");
  return clean ? `${clean}/api` : "/api";
})();

async function apiSend<T>(method: string, path: string, body?: any): Promise<T> {
  // Adiciona um timestamp para evitar cache do navegador (importante para auth)
  const separator = path.includes("?") ? "&" : "?";
  const url = `${API_BASE}${path}${separator}t=${Date.now()}`;

  const res = await fetch(url, {
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
