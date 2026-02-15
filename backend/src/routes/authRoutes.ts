import { Router } from "express";
import rateLimit from "express-rate-limit";
import config from "../config/env";
import authGuard from "../middleware/authGuard";
import {
  listSessions,
  login,
  logout,
  logoutOtherDevices,
  passkeyLoginOptions,
  passkeyLoginVerify,
  passkeyRegisterOptions,
  passkeyRegisterVerify,
  oauthCallback,
  oauthStart,
  refresh,
  register,
  revokeSession
} from "../controllers/authController";

const authRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.env === "development",
  message: { message: "Too many login attempts. Try again later." }
});

const refreshLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});

authRouter.post("/register", registerLimiter, register);
authRouter.post("/login", loginLimiter, login);
authRouter.post("/refresh", refreshLimiter, refresh);
authRouter.post("/logout", refreshLimiter, logout);

authRouter.get("/sessions", authGuard, listSessions);
authRouter.post("/logout-other-devices", authGuard, logoutOtherDevices);
authRouter.delete("/sessions/:id", authGuard, revokeSession);
authRouter.post("/passkeys/register/options", authGuard, passkeyRegisterOptions);
authRouter.post("/passkeys/register/verify", authGuard, passkeyRegisterVerify);
authRouter.post("/passkeys/login/options", loginLimiter, passkeyLoginOptions);
authRouter.post("/passkeys/login/verify", loginLimiter, passkeyLoginVerify);

authRouter.get("/oauth/:provider/start", loginLimiter, oauthStart);
authRouter.get("/oauth/:provider/callback", oauthCallback);

export default authRouter;
