import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";
import config from "../config/env";

const accessSecret: Secret = config.jwtSecret;
const refreshSecret: Secret = config.refreshTokenSecret;

const accessSignOptions: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"] };
const refreshSignOptions: SignOptions = {
  expiresIn: config.refreshTokenExpiresIn as SignOptions["expiresIn"]
};

export const signAccessToken = (userId: string): string => jwt.sign({ sub: userId, typ: "access" }, accessSecret, accessSignOptions);

export const signRefreshToken = (userId: string, sessionId: string, seed: string): string =>
  jwt.sign({ sub: userId, sid: sessionId, seed, typ: "refresh" }, refreshSecret, refreshSignOptions);

export const verifyRefreshToken = (token: string): JwtPayload & { sub: string; sid: string; seed: string } => {
  const payload = jwt.verify(token, refreshSecret) as JwtPayload & { sid?: string; seed?: string; sub?: string; typ?: string };

  if (!payload.sub || !payload.sid || !payload.seed || payload.typ !== "refresh") {
    throw new Error("Invalid refresh token");
  }

  return payload as JwtPayload & { sub: string; sid: string; seed: string };
};
