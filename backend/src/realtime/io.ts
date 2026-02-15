import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import config from "../config/env";

let io: Server | null = null;

export const initSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: config.frontendOrigin,
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    try {
      const authToken = socket.handshake.auth?.token as string | undefined;
      const headerToken = socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice(7)
        : undefined;
      const token = authToken || headerToken;

      if (!token) return next(new Error("Missing auth token"));

      const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;
      socket.data.userId = String(payload.sub);
      return next();
    } catch {
      return next(new Error("Unauthorized socket"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    socket.join(`user:${userId}`);

    socket.on("task:subscribe", (taskId: string) => {
      if (typeof taskId === "string" && taskId.length > 0) {
        socket.join(`task:${taskId}`);
      }
    });

    socket.on("task:unsubscribe", (taskId: string) => {
      if (typeof taskId === "string" && taskId.length > 0) {
        socket.leave(`task:${taskId}`);
      }
    });
  });

  return io;
};

export const getIo = (): Server | null => io;
