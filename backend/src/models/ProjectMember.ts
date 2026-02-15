import mongoose, { Schema } from "mongoose";

export type ProjectRole = "owner" | "admin" | "member" | "viewer";

export type ProjectMemberDocument = {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: ProjectRole;
  invitedBy: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const projectMemberSchema = new Schema<ProjectMemberDocument>(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "admin", "member", "viewer"], default: "member", required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }
  },
  { timestamps: true }
);

projectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });
projectMemberSchema.index({ userId: 1, projectId: 1 });

const ProjectMember = mongoose.model<ProjectMemberDocument>("ProjectMember", projectMemberSchema);

export default ProjectMember;
