import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import config from "./config/env";
import errorHandler from "./middleware/errorHandler";
import aiRouter from "./routes/aiRoutes";
import analyticsRouter from "./routes/analyticsRoutes";
import authRouter from "./routes/authRoutes";
import docsRouter from "./routes/docsRoutes";
import integrationRouter from "./routes/integrationRoutes";
import notificationRouter from "./routes/notificationRoutes";
import projectRouter from "./routes/projectRoutes";
import taskRouter from "./routes/taskRoutes";
import workspaceRouter from "./routes/workspaceRoutes";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.frontendOrigin }));
app.use(express.json());
app.use(morgan("dev"));
app.use("/uploads", express.static(config.uploadDir));
app.use((_req, res, next) => {
  res.setHeader("X-API-Version", "1.0");
  next();
});

app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
app.use("/", docsRouter);
app.use("/api/v1", docsRouter);

app.use("/auth", authRouter);
app.use("/projects", projectRouter);
app.use("/workspaces", workspaceRouter);
app.use("/tasks", taskRouter);
app.use("/integrations", integrationRouter);
app.use("/ai", aiRouter);
app.use("/notifications", notificationRouter);
app.use("/analytics", analyticsRouter);
app.use(errorHandler);

export default app;
