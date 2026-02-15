import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional()
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member")
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "member", "viewer"])
});
