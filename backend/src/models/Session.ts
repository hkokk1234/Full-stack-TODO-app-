import mongoose, { Schema } from "mongoose";

export type SessionDocument = {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  userAgent: string;
  ipAddress: string;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const sessionSchema = new Schema<SessionDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    refreshTokenHash: { type: String, required: true, index: true },
    userAgent: { type: String, default: "unknown" },
    ipAddress: { type: String, default: "unknown" },
    expiresAt: { type: Date, required: true, index: true },
    lastUsedAt: { type: Date, default: () => new Date() },
    revokedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: -1 });

const Session = mongoose.model<SessionDocument>("Session", sessionSchema);

export default Session;
