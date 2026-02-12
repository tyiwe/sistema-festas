import 'dotenv/config';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[env] Missing ${name}`);
  return v;
}

export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  JWT_SECRET: req("JWT_SECRET"),
  ADMIN_CODE: process.env.ADMIN_CODE ?? "admin-code",
  CLIENT_URL: process.env.CLIENT_URL,
  SUPABASE_URL: req("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: req("SUPABASE_SERVICE_ROLE_KEY"),
  SUPABASE_BUCKET: process.env.SUPABASE_BUCKET ?? "event-images",
} as const;
