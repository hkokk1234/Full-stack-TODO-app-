import { z } from "zod";

export const oauthProviderSchema = z.enum(["google"]);

export const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1)
});
