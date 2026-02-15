import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test_jwt_secret";
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET ?? "test_refresh_secret";
process.env.FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
process.env.OAUTH_FRONTEND_CALLBACK_URL = process.env.OAUTH_FRONTEND_CALLBACK_URL ?? "http://localhost:5173/oauth/callback";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? "backend/uploads-test";
process.env.PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL ?? "http://localhost:5000";

let mongoServer: MongoMemoryServer | null = null;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();

  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "backend/uploads-test");
  await fs.rm(uploadDir, { recursive: true, force: true });
});

