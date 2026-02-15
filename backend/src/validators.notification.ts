import { z } from "zod";

export const listNotificationsSchema = z.object({
  unreadOnly: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export const updateNotificationPreferencesSchema = z
  .object({
    inAppDueSoon: z.boolean().optional(),
    emailDueSoon: z.boolean().optional(),
    unsubscribedAll: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "At least one field is required" });
