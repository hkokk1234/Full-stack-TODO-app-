import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { captureException } from "../observability";

type ApiError = Error & { statusCode?: number; name?: string };

const errorHandler = (err: ApiError, _req: Request, res: Response, next: NextFunction): Response | void => {
  if (res.headersSent) return next(err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  if (err.name === "JsonWebTokenError") return res.status(401).json({ message: "Invalid token" });
  if (err.name === "TokenExpiredError") return res.status(401).json({ message: "Token expired" });

  captureException(err);

  return res.status(err.statusCode ?? 500).json({ message: err.message ?? "Internal server error" });
};

export default errorHandler;
