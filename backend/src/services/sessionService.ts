import crypto from "crypto";
import Session from "../models/Session";
import { signRefreshToken, verifyRefreshToken } from "../utils/jwt";

const hashToken = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const computeExpiry = (durationDays = 30): Date => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
};

export const createSession = async (payload: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ refreshToken: string; sessionId: string }> => {
  const seed = crypto.randomBytes(32).toString("hex");

  const session = await Session.create({
    userId: payload.userId,
    refreshTokenHash: hashToken(seed),
    userAgent: payload.userAgent || "unknown",
    ipAddress: payload.ipAddress || "unknown",
    expiresAt: computeExpiry(30),
    lastUsedAt: new Date(),
    revokedAt: null
  });

  const refreshToken = signRefreshToken(payload.userId, String(session._id), seed);
  return { refreshToken, sessionId: String(session._id) };
};

export const rotateRefreshToken = async (rawToken: string): Promise<{ userId: string; refreshToken: string; sessionId: string } | null> => {
  const payload = verifyRefreshToken(rawToken);
  const session = await Session.findById(payload.sid);
  if (!session) return null;

  if (String(session.userId) !== payload.sub) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() < Date.now()) return null;

  const currentHash = hashToken(payload.seed);
  if (session.refreshTokenHash !== currentHash) return null;

  const nextSeed = crypto.randomBytes(32).toString("hex");
  session.refreshTokenHash = hashToken(nextSeed);
  session.lastUsedAt = new Date();
  await session.save();

  const nextRefresh = signRefreshToken(String(session.userId), String(session._id), nextSeed);

  return {
    userId: String(session.userId),
    sessionId: String(session._id),
    refreshToken: nextRefresh
  };
};

export const revokeSessionByRefreshToken = async (rawToken: string): Promise<boolean> => {
  try {
    const payload = verifyRefreshToken(rawToken);
    const session = await Session.findById(payload.sid);
    if (!session) return false;

    const hash = hashToken(payload.seed);
    if (session.refreshTokenHash !== hash) return false;

    session.revokedAt = new Date();
    await session.save();
    return true;
  } catch {
    return false;
  }
};

export const revokeAllOtherSessions = async (userId: string, keepSessionId?: string): Promise<void> => {
  const filter: Record<string, unknown> = { userId, revokedAt: null };
  if (keepSessionId) {
    filter._id = { $ne: keepSessionId };
  }

  await Session.updateMany(filter, { $set: { revokedAt: new Date() } });
};

export const listActiveSessions = async (userId: string) => {
  return Session.find({ userId, revokedAt: null, expiresAt: { $gt: new Date() } })
    .sort({ lastUsedAt: -1 })
    .lean();
};

export const revokeSessionById = async (userId: string, sessionId: string): Promise<boolean> => {
  const session = await Session.findOne({ _id: sessionId, userId, revokedAt: null });
  if (!session) return false;
  session.revokedAt = new Date();
  await session.save();
  return true;
};
