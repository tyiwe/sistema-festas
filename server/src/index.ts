import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import userAuthRouter, { getUserId, requireUserLogin } from "./user-auth";

const app = express();

// Configuração de CORS para desenvolvimento e produção
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL, // URL do frontend no Netlify
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Permitir domínios específicos
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Permitir qualquer domínio .netlify.app
    if (origin.endsWith('.netlify.app')) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api/user", userAuthRouter);

// Upload de imagens (usa memória; envia para Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ADMIN_COOKIE = "sf_admin";

function signAdminToken() {
  return jwt.sign({ role: "admin" }, env.JWT_SECRET, { expiresIn: "7d" });
}

function isAdmin(req: express.Request): boolean {
  const token = req.cookies?.[ADMIN_COOKIE];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return decoded?.role === "admin";
  } catch {
    return false;
  }
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

const DEFAULT_DRINKS = [
  "Gin",
  "Vodka",
  "Whisky",
  "Cerveja",
  "Vinho",
  "Energético",
  "Água",
  "Refrigerante",
] as const;

// ---------- Auth (Obsoleto - usar login de usuário com is_admin) ----------
// Rota de login antigo removida. Use /api/user/login com ADMIN_CODE no cadastro.

// app.post("/api/auth/logout", ...) - Removido, use /api/user/logout

app.get("/api/auth/me", (req, res) => {
  res.json({ authenticated: isAdmin(req) });
});

// ---------- Helpers ----------
function toISODateTime(value: string): string {
  // Accept either ISO or datetime-local (YYYY-MM-DDTHH:mm)
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Data/hora inválida");
  return d.toISOString();
}

// ---------- Public ----------
app.get("/api/public/events", async (_req, res) => {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,slug,description,date_time,location,cover_image_url,gallery_image_urls,status,registration_deadline,capacity")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("date_time", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ events: data ?? [] });
});

app.get("/api/public/events/:slug", async (req, res) => {
  const slug = String(req.params.slug);

  const { data: event, error } = await supabase
    .from("events")
    .select("id,title,slug,description,date_time,location,cover_image_url,gallery_image_urls,status,registration_deadline,capacity")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!event || event.status !== "published") {
    res.status(404).json({ error: "event not found" });
    return;
  }

  const { data: options, error: optErr } = await supabase
    .from("event_options")
    .select("id,event_id,type,name,is_available")
    .eq("event_id", event.id)
    .eq("type", "drink")
    .eq("is_available", true)
    .order("created_at", { ascending: true });

  if (optErr) {
    res.status(500).json({ error: optErr.message });
    return;
  }

  res.json({ event, options: options ?? [] });
});

app.post("/api/public/events/:slug/register", async (req, res) => {
  const slug = String(req.params.slug);

  const bodySchema = z.object({
    full_name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(8),
    allergies: z.string().optional().default(""),
    notes: z.string().optional().default(""),
    selections: z.array(z.string().uuid()).optional().default([]),
  });

  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { data: event, error: eErr } = await supabase
    .from("events")
    .select("id,registration_deadline,capacity,status")
    .is("deleted_at", null)
    .eq("slug", slug)
    .maybeSingle();

  if (eErr) {
    res.status(500).json({ error: eErr.message });
    return;
  }
  if (!event || event.status !== "published") {
    res.status(404).json({ error: "event not found" });
    return;
  }

  // deadline
  if (event.registration_deadline) {
    const deadline = new Date(event.registration_deadline);
    if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
      res.status(400).json({ error: "inscrições encerradas" });
      return;
    }
  }

  // capacity
  if (event.capacity) {
    const { count, error: cErr } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id);
    if (cErr) {
      res.status(500).json({ error: cErr.message });
      return;
    }
    if ((count ?? 0) >= event.capacity) {
      res.status(400).json({ error: "evento lotado" });
      return;
    }
  }

  // Validate selections belong to event and are available
  const selectionIds = parsed.data.selections;
  if (selectionIds.length) {
    const { data: validOptions, error: vErr } = await supabase
      .from("event_options")
      .select("id")
      .eq("event_id", event.id)
      .eq("type", "drink")
      .eq("is_available", true)
      .in("id", selectionIds);

    if (vErr) {
      res.status(500).json({ error: vErr.message });
      return;
    }

    const validSet = new Set((validOptions ?? []).map((o) => o.id));
    const invalid = selectionIds.filter((id) => !validSet.has(id));
    if (invalid.length) {
      res.status(400).json({ error: "uma ou mais opções são inválidas" });
      return;
    }
  }

  const userId = getUserId(req);
  const { data: reg, error: rErr } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      user_id: userId || null,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      allergies: parsed.data.allergies || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (rErr) {
    res.status(500).json({ error: rErr.message });
    return;
  }

  if (selectionIds.length) {
    const rows = selectionIds.map((option_id) => ({
      registration_id: reg.id,
      option_id,
    }));

    const { error: sErr } = await supabase.from("registration_selections").insert(rows);
    if (sErr) {
      res.status(500).json({ error: sErr.message });
      return;
    }
  }

  res.json({ ok: true, registration_id: reg.id });
});

// ---------- Admin: Events ----------
const eventUpsertSchema = z.object({
  title: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/i, "use apenas letras/números e -"),
  description: z.string().optional().default(""),
  date_time: z.string().min(1),
  location: z.string().min(2),
  cover_image_url: z.string().url().optional().nullable(),
  gallery_image_urls: z.array(z.string().url()).max(3).optional().default([]),
  status: z.enum(["draft", "published"]).optional().default("draft"),
  registration_deadline: z.string().optional().nullable(),
  capacity: z.number().int().positive().optional().nullable(),
  create_default_drinks: z.boolean().optional().default(true),
});

// Upload de imagens para o Supabase Storage.
// Retorna uma URL pública para salvar no banco (cover_image_url / gallery_image_urls).
app.post("/api/admin/upload", requireAdmin, upload.single("file"), async (req, res) => {
  const f = (req as any).file as Express.Multer.File | undefined;
  if (!f) {
    res.status(400).json({ error: "file is required" });
    return;
  }

  if (!f.mimetype?.startsWith("image/")) {
    res.status(400).json({ error: "only image files are allowed" });
    return;
  }

  const bucket = env.SUPABASE_BUCKET;
  const original = String(f.originalname ?? "image");
  const ext = (original.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const safeExt = ext.length ? ext : "jpg";

  // opcional: organizamos por eventId
  const eventId = String((req.body?.eventId ?? req.body?.event_id ?? "")).trim();
  const prefix = eventId ? `events/${eventId}` : "events";
  const rand = Math.random().toString(16).slice(2);
  const path = `${prefix}/${Date.now()}-${rand}.${safeExt}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, f.buffer, {
    contentType: f.mimetype,
    upsert: false,
  });

  if (upErr) {
    res.status(400).json({ error: upErr.message });
    return;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  res.json({ url: data.publicUrl, path });
});

app.get("/api/admin/events", requireAdmin, async (_req, res) => {
  const { data, error } = await supabase
    .from("events")
    .select("id,title,slug,description,date_time,location,cover_image_url,gallery_image_urls,status,registration_deadline,capacity,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ events: data ?? [] });
});

app.post("/api/admin/events", requireAdmin, async (req, res) => {
  const parsed = eventUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  let iso: string;
  try {
    iso = toISODateTime(parsed.data.date_time);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? "invalid date_time" });
    return;
  }

  const deadline = parsed.data.registration_deadline ? toISODateTime(parsed.data.registration_deadline) : null;

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      date_time: iso,
      location: parsed.data.location,
      cover_image_url: parsed.data.cover_image_url ?? null,
      gallery_image_urls: parsed.data.gallery_image_urls ?? [],
      status: parsed.data.status,
      registration_deadline: deadline,
      capacity: parsed.data.capacity ?? null,
    })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (parsed.data.create_default_drinks) {
    const rows = DEFAULT_DRINKS.map((name) => ({
      event_id: event.id,
      type: "drink",
      name,
      is_available: true,
    }));

    const { error: optErr } = await supabase.from("event_options").insert(rows);
    if (optErr) {
      // Non-fatal: event exists, but options failed
      res.json({ event, warning: optErr.message });
      return;
    }
  }

  res.json({ event });
});

app.patch("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);

  const patchSchema = eventUpsertSchema.partial().extend({
    create_default_drinks: z.boolean().optional(),
  });

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const patch: any = { ...parsed.data };
  if (patch.date_time) patch.date_time = toISODateTime(patch.date_time);
  if (patch.registration_deadline) patch.registration_deadline = toISODateTime(patch.registration_deadline);

  // Quando não vier no PATCH, não mexe. Quando vier como null, zod não aceita (mantemos array).
  if (patch.gallery_image_urls == null) delete patch.gallery_image_urls;

  delete patch.create_default_drinks;

  const { data, error } = await supabase
    .from("events")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ event: data });
});

app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { error } = await supabase
    .from("events")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// ---------- Admin: Options ----------
const optionSchema = z.object({
  type: z.enum(["drink", "food"]).default("drink"),
  name: z.string().min(1).max(100),
  is_available: z.boolean().optional().default(true),
});

app.get("/api/admin/events/:id/options", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);
  const { data, error } = await supabase
    .from("event_options")
    .select("id,event_id,type,name,is_available,created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ options: data ?? [] });
});

app.post("/api/admin/events/:id/options", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);
  const parsed = optionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("event_options")
    .insert({
      event_id: eventId,
      type: parsed.data.type,
      name: parsed.data.name,
      is_available: parsed.data.is_available,
    })
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ option: data });
});

app.patch("/api/admin/options/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const parsed = optionSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { data, error } = await supabase
    .from("event_options")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ option: data });
});

app.delete("/api/admin/options/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  // delete option; selections keep but will break FK if cascade not set; schema uses REFERENCES with CASCADE? in user's schema, selections references option_id. likely ON DELETE CASCADE missing. To be safe, soft-disable.
  const { error } = await supabase.from("event_options").update({ is_available: false }).eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// ---------- Admin: Registrations & Stats ----------
app.get("/api/admin/events/:id/registrations", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);

  const { data: regs, error } = await supabase
    .from("registrations")
    .select("id,event_id,full_name,email,phone,allergies,notes,created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const regIds = (regs ?? []).map((r) => r.id);
  let selections: any[] = [];
  if (regIds.length) {
    const { data: sel, error: sErr } = await supabase
      .from("registration_selections")
      .select("registration_id,option_id,event_options(name,type)")
      .in("registration_id", regIds);

    if (sErr) {
      res.status(500).json({ error: sErr.message });
      return;
    }
    selections = sel ?? [];
  }

  const byReg: Record<string, any[]> = {};
  for (const s of selections) {
    const rid = s.registration_id;
    if (!byReg[rid]) byReg[rid] = [];
    byReg[rid].push({ option_id: s.option_id, name: s.event_options?.name, type: s.event_options?.type });
  }

  const rows = (regs ?? []).map((r) => ({
    ...r,
    selections: byReg[r.id] ?? [],
  }));

  res.json({ registrations: rows });
});

app.get("/api/admin/events/:id/stats", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);

  const { data: options, error: oErr } = await supabase
    .from("event_options")
    .select("id,name,type,is_available")
    .eq("event_id", eventId)
    .eq("type", "drink")
    .order("created_at", { ascending: true });

  if (oErr) {
    res.status(500).json({ error: oErr.message });
    return;
  }

  const { data: regs, error: rErr } = await supabase
    .from("registrations")
    .select("id", { count: "exact" })
    .eq("event_id", eventId);

  if (rErr) {
    res.status(500).json({ error: rErr.message });
    return;
  }

  const regIds = (regs ?? []).map((r) => r.id);
  let counts: Record<string, number> = {};
  if (regIds.length) {
    const { data: sels, error: sErr } = await supabase
      .from("registration_selections")
      .select("option_id")
      .in("registration_id", regIds);

    if (sErr) {
      res.status(500).json({ error: sErr.message });
      return;
    }

    for (const s of sels ?? []) counts[s.option_id] = (counts[s.option_id] ?? 0) + 1;
  }

  const drinkCounts = (options ?? []).map((o) => ({
    option_id: o.id,
    name: o.name,
    is_available: o.is_available,
    count: counts[o.id] ?? 0,
  })).sort((a,b)=>b.count-a.count);

  res.json({
    total_registrations: regs?.length ?? 0,
    drink_counts: drinkCounts,
  });
});

// ---------- Root ----------
app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(env.PORT, () => {
  console.log(`[server] running on http://localhost:${env.PORT}`);
});
