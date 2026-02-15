import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import config from "../config/env";

type StoredAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  provider: "local" | "s3" | "cloudinary";
  storageKey: string;
  createdAt: Date;
};

const safeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
};

export const storeAttachment = async (file: Express.Multer.File): Promise<StoredAttachment> => {
  if (config.attachmentStorage !== "local") {
    throw new Error("Only ATTACHMENT_STORAGE=local is implemented for now.");
  }

  await fs.mkdir(config.uploadDir, { recursive: true });
  const extension = path.extname(file.originalname || "") || "";
  const base = path.basename(file.originalname || "file", extension);
  const storageName = `${Date.now()}_${randomUUID()}_${safeFileName(base)}${extension}`;
  const absolutePath = path.join(config.uploadDir, storageName);

  await fs.writeFile(absolutePath, file.buffer);

  return {
    id: randomUUID(),
    name: file.originalname || storageName,
    url: `${config.publicBaseUrl}/uploads/${storageName}`,
    mimeType: file.mimetype || "application/octet-stream",
    size: file.size,
    provider: "local",
    storageKey: storageName,
    createdAt: new Date()
  };
};

export const removeAttachment = async (storageKey: string, provider: string): Promise<void> => {
  if (provider !== "local") return;
  const absolutePath = path.join(config.uploadDir, storageKey);
  try {
    await fs.unlink(absolutePath);
  } catch {
    // File might already be removed.
  }
};
