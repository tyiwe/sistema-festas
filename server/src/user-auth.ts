import express from "express";
import { z } from "zod";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { env } from "./env.js";

const router = express.Router();
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const USER_COOKIE = "sf_user";

function signUserToken(userId: string) {
  return jwt.sign({ userId, role: "user" }, env.JWT_SECRET, { expiresIn: "30d" });
}

export function isUserLoggedIn(req: express.Request, res?: express.Response): boolean {
  const token = req.cookies?.[USER_COOKIE];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return !!decoded?.userId;
  } catch (err) {
    // Se o token for inválido ou expirado e tivermos o objeto res, limpamos o cookie
    if (res) {
      console.log("[AUTH] Token inválido detectado, limpando cookie sf_user");
      res.clearCookie(USER_COOKIE, { 
        path: "/", 
        sameSite: "none", 
        secure: true,
        // @ts-ignore
        partitioned: true,
      });
    }
    return false;
  }
}

export function getUserId(req: express.Request, res?: express.Response): string | null {
  const token = req.cookies?.[USER_COOKIE];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    return decoded?.userId || null;
  } catch (err) {
    if (res) {
      console.log("[AUTH] Token inválido detectado no getUserId, limpando cookie sf_user");
      res.clearCookie(USER_COOKIE, { 
        path: "/", 
        sameSite: "none", 
        secure: true,
        // @ts-ignore
        partitioned: true,
      });
    }
    return null;
  }
}

export function requireUserLogin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!isUserLoggedIn(req, res)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

router.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email("E-mail inválido"),
    email_confirm: z.string().email("Confirmação de e-mail inválida"),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
    full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { email, email_confirm, password, full_name } = parsed.data;

  if (email !== email_confirm) {
    res.status(400).json({ error: "E-mails não coincidem" });
    return;
  }

  const { data: existingUser } = await supabase
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    res.status(400).json({ error: "E-mail já cadastrado" });
    return;
  }

  const passwordHash = await bcryptjs.hash(password, 10);

  const { data: newUser, error } = await supabase
    .from("users")
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name,
      is_admin: true,
      phone: "",
    })
    .select("id, is_admin")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  const token = signUserToken(newUser.id);
  
  res.cookie(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // @ts-ignore - partitioned is relatively new but helps with Safari/Chrome cross-site
    partitioned: true,
  });

  res.json({ ok: true, user: { id: newUser.id, email, full_name, is_admin: newUser.is_admin } });
});

// Login de usuário
router.post("/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email("E-mail inválido"),
    password: z.string().min(1, "Senha é obrigatória"),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, password_hash, full_name, is_admin")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error || !user) {
    res.status(401).json({ error: "E-mail ou senha inválidos" });
    return;
  }

  const passwordMatch = await bcryptjs.compare(password, user.password_hash);
  if (!passwordMatch) {
    res.status(401).json({ error: "E-mail ou senha inválidos" });
    return;
  }

  const token = signUserToken(user.id);
  
  // CONFIGURAÇÃO DE COOKIE PARA PRODUÇÃO (CROSS-DOMAIN)
  res.cookie(USER_COOKIE, token, {
    httpOnly: true,
    sameSite: "none", // Necessário para Netlify -> Render
    secure: true,     // Necessário para SameSite: none
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    // @ts-ignore - partitioned is relatively new but helps with Safari/Chrome cross-site
    partitioned: true,
  });

  res.json({ ok: true, user: { id: user.id, email: user.email, full_name: user.full_name, is_admin: user.is_admin } });
});

// Logout de usuário
router.post("/logout", (req, res) => {
  console.log(`[User Logout] Clearing cookie ${USER_COOKIE} for userId: ${getUserId(req)}`);
  res.clearCookie(USER_COOKIE, { 
    path: "/",
    sameSite: "none",
    secure: true,
    // @ts-ignore
    partitioned: true,
  });
  res.json({ ok: true });
});

// Verificar se usuário está logado
router.get("/me", (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) {
    res.json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, userId });
});

// Obter dados do usuário logado
router.get("/profile", requireUserLogin, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, full_name, phone, is_admin, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !user) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }

  res.json({ user });
});

// Atualizar perfil do usuário
router.put("/profile", requireUserLogin, async (req, res) => {
  const userId = getUserId(req);
  const schema = z.object({
    full_name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").optional(),
    phone: z.string().optional(),
    password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres").optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid body", details: parsed.error.flatten() });
    return;
  }

  const updateData: any = {};
  if (parsed.data.full_name) updateData.full_name = parsed.data.full_name;
  if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
  if (parsed.data.password) {
    updateData.password_hash = await bcryptjs.hash(parsed.data.password, 10);
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "Nenhum dado para atualizar" });
    return;
  }

  const { data, error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId)
    .select("id, email, full_name, phone, is_admin")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ ok: true, user: data });
});

// Minhas inscrições
router.get("/my-registrations", requireUserLogin, async (req, res) => {
  const userId = getUserId(req, res);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { data: registrations, error } = await supabase
    .from("registrations")
    .select(`
      id,
      event_id,
      full_name,
      email,
      phone,
      allergies,
      notes,
      created_at,
      events(id, title, slug, date_time, location),
      registration_selections(option_id, event_options(name))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ registrations: registrations ?? [] });
});

// Cancelar inscrição
router.delete("/registrations/:id", requireUserLogin, async (req, res) => {
  const userId = getUserId(req);
  const registrationId = String(req.params.id);

  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const { data: registration, error: checkError } = await supabase
    .from("registrations")
    .select("id, user_id")
    .eq("id", registrationId)
    .maybeSingle();

  if (checkError || !registration) {
    res.status(404).json({ error: "Inscrição não encontrada" });
    return;
  }

  if (registration.user_id !== userId) {
    res.status(403).json({ error: "Você não tem permissão para cancelar esta inscrição" });
    return;
  }

  const { error: deleteError } = await supabase
    .from("registrations")
    .delete()
    .eq("id", registrationId);

  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  res.json({ ok: true });
});

export default router;
