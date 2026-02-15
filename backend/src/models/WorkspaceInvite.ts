import mongoose, { Schema } from "mongoose";

export type WorkspaceInviteDocument = {
  workspaceId: mongoose.Types.ObjectId;
  email: string;
  role: "admin" | "member" | "viewer";
  token: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  invitedBy: mongoose.Types.ObjectId;
  acceptedBy: mongoose.Types.ObjectId | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

const workspaceInviteSchema = new Schema<WorkspaceInviteDocument>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    role: { type: String, enum: ["admin", "member", "viewer"], default: "member", required: true },
    token: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["pending", "accepted", "revoked", "expired"], default: "pending", index: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    acceptedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

workspaceInviteSchema.index(
  { workspaceId: 1, email: 1, status: 1 },
  { partialFilterExpression: { status: "pending" }, unique: true }
);

const WorkspaceInvite = mongoose.model<WorkspaceInviteDocument>("WorkspaceInvite", workspaceInviteSchema);

export default WorkspaceInvite;

