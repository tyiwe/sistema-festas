import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";
import userAuthRouter, { authenticateUser, isAdmin } from "./user-auth.js";

const app = express();
const PORT = env.PORT || 3001;

// Configuração de CORS para permitir cookies entre domínios
const allowedOrigins = [
  "http://localhost:5173",
  "https://festase.netlify.app",
  "https://sistema-festas-backend.onrender.com"
];

if (env.CLIENT_URL) {
  allowedOrigins.push(env.CLIENT_URL.replace(/\/$/, ""));
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());

// Upload de imagens
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas de Autenticação
app.use("/api/user", userAuthRouter);

// --- HELPERS ---
function toISODateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Data/hora inválida");
  return d.toISOString();
}

// --- ROTAS PÚBLICAS ---
app.get("/api/public/events", async (_req, res) => {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .is("deleted_at", null)
    .eq("status", "published")
    .order("date_time", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data ?? [] });
});

app.get("/api/public/events/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .is("deleted_at", null)
      .single();

    if (eventError || !event) return res.status(404).json({ error: "Evento não encontrado" });

    const { data: options } = await supabase
      .from("event_options")
      .select("*")
      .eq("event_id", event.id)
      .eq("is_available", true);

    res.json({ event, options: options || [] });
  } catch (error) {
    res.status(500).json({ error: "Erro interno" });
  }
});

app.post("/api/public/registrations", authenticateUser, async (req, res) => {
  try {
    const { event_id, option_ids, allergies, notes, phone, full_name } = req.body;
    const user_id = (req as any).user.id;

    if (full_name || phone) {
      await supabase.from("profiles").update({ full_name, phone }).eq("id", user_id);
    }

    const { data: reg, error: regError } = await supabase
      .from("registrations")
      .insert({ event_id, user_id, allergies, notes })
      .select()
      .single();

    if (regError) throw regError;

    if (option_ids && option_ids.length > 0) {
      const selections = option_ids.map((oid: string) => ({
        registration_id: reg.id,
        option_id: oid
      }));
      await supabase.from("registration_selections").insert(selections);
    }

    res.json({ success: true, registration_id: reg.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- ROTAS ADMIN ---
const adminRouter = express.Router();
adminRouter.use(authenticateUser, isAdmin);

adminRouter.post("/upload", upload.single("file"), async (req, res) => {
  const f = (req as any).file;
  if (!f) return res.status(400).json({ error: "Arquivo é obrigatório" });

  const bucket = env.SUPABASE_BUCKET || "event-images";
  const ext = f.originalname.split(".").pop();
  const path = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error: upErr } = await supabase.storage.from(bucket).upload(path, f.buffer, {
    contentType: f.mimetype,
    upsert: false,
  });

  if (upErr) return res.status(400).json({ error: upErr.message });
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  res.json({ url: data.publicUrl });
});

adminRouter.get("/events", async (req, res) => {
  const { data, error } = await supabase.from("events").select("*").is("deleted_at", null).order("date_time", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ events: data });
});

adminRouter.post("/events", async (req, res) => {
  try {
    const { create_default_drinks, ...eventData } = req.body;
    const { data: event, error } = await supabase.from("events").insert({
      ...eventData,
      date_time: toISODateTime(eventData.date_time),
      registration_deadline: eventData.registration_deadline ? toISODateTime(eventData.registration_deadline) : null,
    }).select().single();
    if (error) throw error;

    if (create_default_drinks) {
      const DEFAULT_DRINKS = ["Gin", "Vodka", "Whisky", "Cerveja", "Vinho", "Energético", "Água", "Refrigerante"];
      const drinkRows = DEFAULT_DRINKS.map(name => ({
        event_id: event.id,
        type: "drink" as const,
        name,
        is_available: true
      }));
      await supabase.from("event_options").insert(drinkRows);
    }

    res.json(event);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminRouter.put("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from("events").update({
      ...req.body,
      date_time: toISODateTime(req.body.date_time),
      registration_deadline: req.body.registration_deadline ? toISODateTime(req.body.registration_deadline) : null,
      updated_at: new Date().toISOString()
    }).eq("id", id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

adminRouter.get("/events/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: event } = await supabase.from("events").select("*").eq("id", id).single();
    const { data: registrations } = await supabase
      .from("registrations")
      .select("*, profiles(full_name, email, phone), registration_selections(option_id, event_options(name))")
      .eq("event_id", id);

    res.json({ event, registrations: registrations || [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.use("/api/admin", adminRouter);

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
