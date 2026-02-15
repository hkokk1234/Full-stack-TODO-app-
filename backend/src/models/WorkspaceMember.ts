import mongoose, { Schema } from "mongoose";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceMemberDocument = {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: WorkspaceRole;
  invitedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const workspaceMemberSchema = new Schema<WorkspaceMemberDocument>(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member", "viewer"], required: true, default: "member" },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });
workspaceMemberSchema.index({ userId: 1, workspaceId: 1 });

const WorkspaceMember = mongoose.model<WorkspaceMemberDocument>("WorkspaceMember", workspaceMemberSchema);

export default WorkspaceMember;

