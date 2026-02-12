import { z } from "zod";

export const loginSchema = z.object({
  password: z.string().min(1),
});

export const eventCreateSchema = z.object({
  title: z.string().min(3).max(255),
  slug: z.string().min(3).max(255).regex(/^[a-z0-9-]+$/, "Slug inválido"),
  description: z.string().min(10),
  location: z.string().min(3),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  eventTime: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(["draft", "published"]).optional().default("draft"),
});

export const eventUpdateSchema = eventCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const registrationCreateSchema = z.object({
  fullName: z.string().min(3).max(255),
  email: z.string().email(),
  phone: z.string().min(8).max(30),
  allergies: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});
