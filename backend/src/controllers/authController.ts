import bcrypt from "bcryptjs";
import type { Request, Response } from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { signAccessToken } from "../utils/jwt";
import {
  loginSchema,
  passkeyLoginOptionsSchema,
  passkeyVerifyLoginSchema,
  passkeyVerifyRegistrationSchema,
  refreshSchema,
  registerSchema
} from "../validators.auth";
import { oauthCallbackSchema, oauthProviderSchema } from "../validators.oauth";
import config from "../config/env";
import {
  buildAuthorizationUrl,
  buildFrontendCallbackUrl,
  decodeState,
  fetchOAuthProfile,
  isProviderConfigured,
  type OAuthProvider
} from "../services/oauthService";
import {
  createSession,
  listActiveSessions,
  revokeAllOtherSessions,
  revokeSessionById,
  revokeSessionByRefreshToken,
  rotateRefreshToken
} from "../services/sessionService";

const sanitizeUser = (user: { _id: unknown; name: string; email: string }) => ({
  id: String(user._id),
  name: user.name,
  email: user.email
});

const deviceMeta = (req: Request): { userAgent: string; ipAddress: string } => ({
  userAgent: req.headers["user-agent"] || "unknown",
  ipAddress: req.ip || req.socket.remoteAddress || "unknown"
});

const authResponse = async (userId: string, req: Request) => {
  const accessToken = signAccessToken(userId);
  const session = await createSession({ userId, ...deviceMeta(req) });

  return {
    token: accessToken,
    accessToken,
    refreshToken: session.refreshToken,
    sessionId: session.sessionId
  };
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const payload = registerSchema.parse(req.body);

  const existing = await User.findOne({ email: payload.email });
  if (existing) return res.status(409).json({ message: "Email already exists" });

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await User.create({ name: payload.name, email: payload.email, passwordHash });

  const tokens = await authResponse(String(user._id), req);

  return res.status(201).json({ ...tokens, user: sanitizeUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const payload = loginSchema.parse(req.body);

  const user = await User.findOne({ email: payload.email });
  if (!user || !user.passwordHash) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isValid) return res.status(401).json({ message: "Invalid credentials" });

  const tokens = await authResponse(String(user._id), req);

  return res.status(200).json({ ...tokens, user: sanitizeUser(user) });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);

  const rotated = await rotateRefreshToken(refreshToken);
  if (!rotated) return res.status(401).json({ message: "Invalid refresh token" });

  const user = await User.findById(rotated.userId);
  if (!user) return res.status(401).json({ message: "Invalid session" });

  const accessToken = signAccessToken(rotated.userId);

  return res.status(200).json({
    token: accessToken,
    accessToken,
    refreshToken: rotated.refreshToken,
    sessionId: rotated.sessionId,
    user: sanitizeUser(user)
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const revoked = await revokeSessionByRefreshToken(refreshToken);
  if (!revoked) return res.status(400).json({ message: "Session already invalid" });
  return res.status(204).send();
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const sessions = await listActiveSessions(userId);
  return res.status(200).json({
    items: sessions.map((session) => ({
      id: String(session._id),
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      lastUsedAt: session.lastUsedAt,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt
    }))
  });
});

export const logoutOtherDevices = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const currentSessionId = typeof req.body?.sessionId === "string" ? req.body.sessionId : undefined;
  await revokeAllOtherSessions(userId, currentSessionId);

  return res.status(204).send();
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const sessionId = req.params.id;
  const revoked = await revokeSessionById(userId, sessionId);
  if (!revoked) return res.status(404).json({ message: "Session not found" });

  return res.status(204).send();
});

export const passkeyRegisterOptions = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const options = await generateRegistrationOptions({
    rpName: config.webauthnRpName,
    rpID: config.webauthnRpId,
    userName: user.email,
    userDisplayName: user.name,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred"
    },
    excludeCredentials: user.passkeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports
    }))
  });

  user.currentChallenge = options.challenge;
  await user.save();

  return res.status(200).json(options);
});

export const passkeyRegisterVerify = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { response } = passkeyVerifyRegistrationSchema.parse(req.body);

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.currentChallenge) return res.status(400).json({ message: "Missing registration challenge" });

  const verification = await verifyRegistrationResponse({
    response: response as unknown as RegistrationResponseJSON,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: config.webauthnOrigin,
    expectedRPID: config.webauthnRpId,
    requireUserVerification: true
  });

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ message: "Passkey registration failed" });
  }

  const { credential } = verification.registrationInfo;
  const credentialId = credential.id;
  const exists = user.passkeys.some((item) => item.credentialID === credentialId);
  if (!exists) {
    user.passkeys.push({
      credentialID: credentialId,
      publicKey: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: verification.registrationInfo.credentialDeviceType,
      backedUp: verification.registrationInfo.credentialBackedUp,
      createdAt: new Date(),
      lastUsedAt: new Date()
    });
  }

  user.currentChallenge = null;
  await user.save();

  return res.status(200).json({ verified: true, passkeysCount: user.passkeys.length });
});

export const passkeyLoginOptions = asyncHandler(async (req: Request, res: Response) => {
  const { email } = passkeyLoginOptionsSchema.parse(req.body);
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.passkeys.length === 0) return res.status(400).json({ message: "No passkeys registered for this user" });

  const options = await generateAuthenticationOptions({
    rpID: config.webauthnRpId,
    userVerification: "preferred",
    allowCredentials: user.passkeys.map((passkey) => ({
      id: passkey.credentialID,
      transports: passkey.transports
    }))
  });

  user.currentChallenge = options.challenge;
  await user.save();

  return res.status(200).json(options);
});

export const passkeyLoginVerify = asyncHandler(async (req: Request, res: Response) => {
  const { email, response } = passkeyVerifyLoginSchema.parse(req.body);

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (!user.currentChallenge) return res.status(400).json({ message: "Missing authentication challenge" });

  const responseId = typeof response.id === "string" ? response.id : "";
  if (!responseId) return res.status(400).json({ message: "Invalid passkey payload" });

  const storedPasskey = user.passkeys.find((passkey) => passkey.credentialID === responseId);
  if (!storedPasskey) return res.status(404).json({ message: "Passkey not found" });

  const verification = await verifyAuthenticationResponse({
    response: response as unknown as AuthenticationResponseJSON,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: config.webauthnOrigin,
    expectedRPID: config.webauthnRpId,
    credential: {
      id: storedPasskey.credentialID,
      publicKey: isoBase64URL.toBuffer(storedPasskey.publicKey),
      counter: storedPasskey.counter,
      transports: storedPasskey.transports
    },
    requireUserVerification: true
  });

  if (!verification.verified) return res.status(401).json({ message: "Passkey verification failed" });

  storedPasskey.counter = verification.authenticationInfo.newCounter;
  storedPasskey.deviceType = verification.authenticationInfo.credentialDeviceType;
  storedPasskey.backedUp = verification.authenticationInfo.credentialBackedUp;
  storedPasskey.lastUsedAt = new Date();
  user.currentChallenge = null;
  await user.save();

  const tokens = await authResponse(String(user._id), req);

  return res.status(200).json({ ...tokens, user: sanitizeUser(user) });
});

export const oauthStart = asyncHandler(async (req: Request, res: Response) => {
  const provider = oauthProviderSchema.parse(req.params.provider) as OAuthProvider;

  if (!isProviderConfigured(provider)) {
    return res.status(503).json({ message: `${provider} OAuth is not configured` });
  }

  const url = buildAuthorizationUrl(provider);
  return res.redirect(url);
});

export const oauthCallback = asyncHandler(async (req: Request, res: Response) => {
  const provider = oauthProviderSchema.parse(req.params.provider) as OAuthProvider;

  if (!isProviderConfigured(provider)) {
    return res.redirect(buildFrontendCallbackUrl({ error: `${provider}_oauth_not_configured` }));
  }

  try {
    const { code, state } = oauthCallbackSchema.parse(req.query);
    const decoded = decodeState(state);

    if (decoded.provider !== provider) {
      return res.redirect(buildFrontendCallbackUrl({ error: "oauth_provider_mismatch" }));
    }

    const profile = await fetchOAuthProfile(provider, code);

    let user = await User.findOne({ googleId: profile.providerId });
    if (!user) {
      const byEmail = await User.findOne({ email: profile.email.toLowerCase() });
      if (byEmail) {
        byEmail.name = byEmail.name || profile.name;
        byEmail.googleId = profile.providerId;
        user = await byEmail.save();
      } else {
        user = await User.create({
          name: profile.name,
          email: profile.email.toLowerCase(),
          passwordHash: null,
          googleId: profile.providerId
        });
      }
    }

    const tokens = await authResponse(String(user._id), req);

    return res.redirect(
      buildFrontendCallbackUrl({
        token: tokens.token,
        refreshToken: tokens.refreshToken,
        id: String(user._id),
        name: user.name,
        email: user.email
      })
    );
  } catch {
    return res.redirect(buildFrontendCallbackUrl({ error: "oauth_failed" }));
  }
});
