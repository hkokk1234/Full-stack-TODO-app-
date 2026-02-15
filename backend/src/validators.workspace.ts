import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(120)
});

export const createWorkspaceInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7)
});

export const acceptWorkspaceInviteSchema = z.object({
  token: z.string().min(20).max(200)
});

