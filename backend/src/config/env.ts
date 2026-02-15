import dotenv from "dotenv";
import path from "path";

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const jwtSecret = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

if (!mongoUri) throw new Error("Missing MONGO_URI in environment.");
if (!jwtSecret) throw new Error("Missing JWT_SECRET in environment.");
if (!refreshTokenSecret) throw new Error("Missing REFRESH_TOKEN_SECRET in environment.");

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const frontendUrl = new URL(frontendOrigin);
const port = Number(process.env.PORT ?? 5000);

const config = {
  env: process.env.NODE_ENV ?? "development",
  port,
  mongoUri,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "15m",
  refreshTokenSecret,
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? "30d",
  frontendOrigin,
  oauthFrontendCallbackUrl: process.env.OAUTH_FRONTEND_CALLBACK_URL ?? `${frontendOrigin}/oauth/callback`,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:5000/auth/oauth/google/callback",
  webauthnRpName: process.env.WEBAUTHN_RP_NAME ?? "TaskFlow",
  webauthnRpId: process.env.WEBAUTHN_RP_ID ?? frontendUrl.hostname,
  webauthnOrigin: process.env.WEBAUTHN_ORIGIN ?? `${frontendUrl.protocol}//${frontendUrl.host}`,

  sentryDsnBackend: process.env.SENTRY_DSN_BACKEND ?? "",
  otelEnabled: (process.env.OTEL_ENABLED ?? "false").toLowerCase() === "true",
  otelExporterOtlpEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "",

  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",

  notificationsEnabled: (process.env.NOTIFICATIONS_ENABLED ?? "true").toLowerCase() === "true",
  reminderCron: process.env.REMINDER_CRON ?? "*/10 * * * *",
  reminderWindowMinutes: Number(process.env.REMINDER_WINDOW_MINUTES ?? 120),
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpSecure: (process.env.SMTP_SECURE ?? "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "noreply@taskflow.local",
  emailRetryMaxAttempts: Number(process.env.EMAIL_RETRY_MAX_ATTEMPTS ?? 5),
  emailRetryBaseMinutes: Number(process.env.EMAIL_RETRY_BASE_MINUTES ?? 5),

  attachmentStorage: process.env.ATTACHMENT_STORAGE ?? "local",
  uploadDir: path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "backend/uploads"),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`
};

export default config;
