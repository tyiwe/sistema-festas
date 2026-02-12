import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import userAuthRouter, { getUserId } from "./user-auth.js";

const app = express();

// Configuração de CORS para desenvolvimento e produção
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL, // URL do frontend no Netlify
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
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

// Upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ADMIN_COOKIE = "sf_admin";

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

app.get("/api/auth/me", (req, res) => {
  res.json({ authenticated: isAdmin(req) });
});

// ---------- Helpers ----------
function toISODateTime(value: string): string {
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

  if (event.registration_deadline) {
    const deadline = new Date(event.registration_deadline);
    if (!Number.isNaN(deadline.getTime()) && Date.now() > deadline.getTime()) {
      res.status(400).json({ error: "inscrições encerradas" });
      return;
    }
  }

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

app.get("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!data) {
    res.status(404).json({ error: "event not found" });
    return;
  }
  res.json({ event: data });
});

app.post("/api/admin/events", requireAdmin, async (req, res) => {
  const parsed = eventUpsertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { create_default_drinks, ...eventData } = parsed.data;
  
  const { data: event, error } = await supabase
    .from("events")
    .insert({
      ...eventData,
      date_time: toISODateTime(eventData.date_time),
      registration_deadline: eventData.registration_deadline ? toISODateTime(eventData.registration_deadline) : null,
    })
    .select("id")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  if (create_default_drinks && event?.id) {
    const drinkRows = DEFAULT_DRINKS.map((name) => ({
      event_id: event.id,
      type: "drink" as const,
      name: String(name),
      is_available: true,
    }));
    await supabase.from("event_options").insert(drinkRows);
  }

  res.json({ ok: true, id: event.id });
});

app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const parsed = eventUpsertSchema.omit({ create_default_drinks: true }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { error } = await supabase
    .from("events")
    .update({
      ...parsed.data,
      date_time: toISODateTime(parsed.data.date_time),
      registration_deadline: parsed.data.registration_deadline ? toISODateTime(parsed.data.registration_deadline) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
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
app.get("/api/admin/events/:id/options", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);
  const { data, error } = await supabase
    .from("event_options")
    .select("*")
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
  const schema = z.object({
    type: z.enum(["drink", "food"]),
    name: z.string().min(1),
    is_available: z.boolean().optional().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }

  const { error } = await supabase
    .from("event_options")
    .insert({ ...parsed.data, event_id: eventId });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

app.put("/api/admin/options/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const schema = z.object({
    name: z.string().min(1).optional(),
    is_available: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body" });
    return;
  }

  const { error } = await supabase
    .from("event_options")
    .update(parsed.data)
    .eq("id", id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

app.delete("/api/admin/options/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const { error } = await supabase.from("event_options").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

// ---------- Admin: Stats/Registrations ----------
app.get("/api/admin/events/:id/stats", requireAdmin, async (req, res) => {
  const eventId = String(req.params.id);

  const { data: registrations, error: rErr } = await supabase
    .from("registrations")
    .select(`
      id,
      full_name,
      email,
      phone,
      allergies,
      notes,
      created_at,
      registration_selections(option_id, event_options(name))
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (rErr) {
    res.status(500).json({ error: rErr.message });
    return;
  }

  const { data: options, error: oErr } = await supabase
    .from("event_options")
    .select("id, name")
    .eq("event_id", eventId);

  if (oErr) {
    res.status(500).json({ error: oErr.message });
    return;
  }

  const counts: Record<string, number> = {};
  for (const opt of options ?? []) {
    counts[opt.name] = 0;
  }

  for (const reg of registrations ?? []) {
    for (const sel of (reg as any).registration_selections ?? []) {
      const name = sel.event_options?.name;
      if (name) counts[name] = (counts[name] || 0) + 1;
    }
  }

  res.json({
    total: registrations?.length ?? 0,
    registrations: registrations ?? [],
    optionCounts: counts,
  });
});

// ---------- Health ----------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = env.PORT || 3001;
app.listen(port, "0.0.0.0", () => {
  console.log(`[server] running on http://0.0.0.0:${port}`);
});
