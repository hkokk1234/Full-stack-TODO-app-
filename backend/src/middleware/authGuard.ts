import type { NextFunction, Request, Response } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import config from "../config/env";

const authGuard = (req: Request, res: Response, next: NextFunction): Response | void => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Missing auth token" });

  const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
  req.user = { id: String(payload.sub), tokenPayload: payload };

  return next();
};

export default authGuard;
