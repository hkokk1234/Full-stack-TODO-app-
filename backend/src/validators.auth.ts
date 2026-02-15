import { z } from "zod";

const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,72}$/;

export const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email(),
  password: z
    .string()
    .regex(
      strongPasswordRegex,
      "Password must be 8-72 chars with upper, lower, number, and symbol"
    )
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72)
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20)
});

export const passkeyLoginOptionsSchema = z.object({
  email: z.string().email()
});

export const passkeyVerifyLoginSchema = z.object({
  email: z.string().email(),
  response: z.record(z.any())
});

export const passkeyVerifyRegistrationSchema = z.object({
  response: z.record(z.any())
});
