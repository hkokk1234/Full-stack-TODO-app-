import "./observability";
import { createServer } from "http";
import app from "./app";
import connectDb from "./config/db";
import config from "./config/env";
import { initSocket } from "./realtime/io";
import { shutdownObservability } from "./observability";
import { startReminderScheduler } from "./services/reminderScheduler";

const start = async (): Promise<void> => {
  await connectDb(config.mongoUri);
  startReminderScheduler();

  const server = createServer(app);
  initSocket(server);

  const graceful = async () => {
    server.close();
    await shutdownObservability();
    process.exit(0);
  };

  process.on("SIGINT", graceful);
  process.on("SIGTERM", graceful);

  server.listen(config.port, () => {
    console.log(`API running on http://localhost:${config.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
