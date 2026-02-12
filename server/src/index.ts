import express from "express";
import type { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import multer from "multer";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import userAuthRouter, { getUserId, requireUserLogin } from "./user-auth.js";

const app = express();

// Configuração de CORS para desenvolvimento e produção
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  process.env.CLIENT_URL,
].filter(Boolean).map(o => o!.replace(/\/$/, ""));

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Se não houver origin (ex: mobile apps, curl, ou same-origin), permite
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/$/, "");
    const allowedPatterns = [
      /^http:\/\/localhost:\d+$/,
      /^http:\/\/127\.0\.0\.1:\d+$/,
      /\.netlify\.app$/,
      /\.onrender\.com$/
    ];

    const isAllowed = allowedPatterns.some(pattern => pattern.test(cleanOrigin)) ||
                     (process.env.CLIENT_URL && cleanOrigin.startsWith(process.env.CLIENT_URL.replace(/\/$/, "")));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Bloqueado: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With"],
}));

// Middleware para log de requisições (ajuda no debug)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} [${req.method}] ${req.url} - Origin: ${req.headers.origin || 'N/A'}`);
  next();
});

app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api/user", userAuthRouter);

// Middleware para evitar cache nas rotas de admin auth
app.use("/api/auth", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// FUNÇÃO DE VERIFICAÇÃO DE ADMIN ATUALIZADA
async function isAdmin(req: express.Request): Promise<boolean> {
  const userId = getUserId(req);
  if (!userId) return false;
  if (userId === "admin") return true;

  try {
    const { data: user, error } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (error || !user) return false;
    return !!user.is_admin;
  } catch {
    return false;
  }
}

// MIDDLEWARE DE ADMIN ATUALIZADO
async function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAdm = await isAdmin(req);
  if (!isAdm) {
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

app.get("/api/auth/me", async (req: Request, res: Response) => {
  const isAdm = await isAdmin(req);
  res.json({ authenticated: isAdm });
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === env.ADMIN_CODE) {
    // Para simplificar, vamos criar um token de admin "especial" 
    // ou apenas usar o sistema de cookies existente se preferir.
    // Como AdminLogin.tsx espera apenas sucesso, vamos assinar um token.
    
    const token = jwt.sign({ userId: "admin", role: "admin" }, env.JWT_SECRET, { expiresIn: "7d" });
    
    res.cookie("sf_user", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      // @ts-ignore
      partitioned: true,
    });
    
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: "invalid password" });
  }
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  res.clearCookie("sf_user", { 
    path: "/", 
    sameSite: "none", 
    secure: true,
    // @ts-ignore
    partitioned: true
  });
  res.json({ ok: true });
});

// ---------- Helpers ----------
function toISODateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Data/hora inválida");
  return d.toISOString();
}

// ---------- Public ----------
app.get("/api/public/events", async (_req: Request, res: Response) => {
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

app.get("/api/public/events/:slug", async (req: Request, res: Response) => {
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

app.post("/api/public/events/:slug/register", requireUserLogin, async (req: Request, res: Response) => {
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

app.post("/api/admin/upload", requireAdmin, upload.single("file"), async (req: Request, res: Response) => {
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

app.get("/api/admin/events", requireAdmin, async (_req: Request, res: Response) => {
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

app.get("/api/admin/events/:id", requireAdmin, async (req: Request, res: Response) => {
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

app.post("/api/admin/events", requireAdmin, async (req: Request, res: Response) => {
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

app.put("/api/admin/events/:id", requireAdmin, async (req: Request, res: Response) => {
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
    .eq("id", id)
    .select();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

app.delete("/api/admin/events/:id", requireAdmin, async (req: Request, res: Response) => {
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
app.get("/api/admin/events/:id/options", requireAdmin, async (req: Request, res: Response) => {
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

app.post("/api/admin/events/:id/options", requireAdmin, async (req: Request, res: Response) => {
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

app.put("/api/admin/options/:id", requireAdmin, async (req: Request, res: Response) => {
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

app.delete("/api/admin/options/:id", requireAdmin, async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const { error } = await supabase.from("event_options").delete().eq("id", id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ ok: true });
});

app.get("/api/admin/events/:id/registrations", requireAdmin, async (req: Request, res: Response) => {
  const eventId = String(req.params.id);

  const { data, error } = await supabase
    .from("registrations")
    .select(`
      id,
      full_name,
      email,
      phone,
      allergies,
      notes,
      created_at,
      registration_selections(
        option_id,
        event_options(name, type)
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const registrations = (data ?? []).map((r: any) => {
    const selections = (r.registration_selections ?? [])
      .map((s: any) => ({
        option_id: s.option_id,
        name: s.event_options?.name ?? "",
        type: s.event_options?.type ?? "",
      }))
      .filter((x: any) => x.option_id && x.name);

    return {
      id: r.id,
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      allergies: r.allergies ?? null,
      notes: r.notes ?? null,
      created_at: r.created_at,
      selections,
    };
  });

  res.json({ registrations });
});

// ---------- Admin: Stats/Registrations ----------
app.get("/api/admin/events/:id/stats", requireAdmin, async (req: Request, res: Response) => {
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
    .select("id, name, is_available")
    .eq("event_id", eventId);

  if (oErr) {
    res.status(500).json({ error: oErr.message });
    return;
  }

  const drinkCounts = (options ?? []).map(opt => ({
    option_id: opt.id,
    name: opt.name,
    is_available: opt.is_available,
    count: 0
  }));

  for (const reg of registrations ?? []) {
    for (const sel of (reg as any).registration_selections ?? []) {
      const optionId = sel.option_id;
      const dc = drinkCounts.find(d => d.option_id === optionId);
      if (dc) dc.count++;
    }
  }

  res.json({
    total_registrations: registrations?.length ?? 0,
    drink_counts: drinkCounts
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
