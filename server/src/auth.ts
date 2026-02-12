import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env.js";

const COOKIE_NAME = "sf_session";
const encoder = new TextEncoder();

export type SessionUser = { role: "admin" };

export async function signSession(res: Response, user: SessionUser) {
  const jwt = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encoder.encode(env.JWT_SECRET));

  res.cookie(COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // set true behind HTTPS
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export async function readSession(req: Request): Promise<SessionUser | null> {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(env.JWT_SECRET));
    if (payload && payload.role === "admin") return { role: "admin" };
    return null;
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const user = await readSession(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });
  (req as any).user = user;
  next();
}
