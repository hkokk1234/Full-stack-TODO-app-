import { z } from "zod";

export const microsoftTokenSchema = z.object({
  accessToken: z.string().min(20)
});

export const microsoftListTasksSchema = microsoftTokenSchema.extend({
  maxItems: z.number().int().min(1).max(100).optional()
});

export const microsoftImportSchema = microsoftListTasksSchema.extend({
  listId: z.string().min(1)
});
