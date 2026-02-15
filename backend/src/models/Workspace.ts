import mongoose, { Schema } from "mongoose";

export type WorkspaceDocument = {
  name: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const workspaceSchema = new Schema<WorkspaceDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

workspaceSchema.index({ ownerId: 1, createdAt: -1 });

const Workspace = mongoose.model<WorkspaceDocument>("Workspace", workspaceSchema);

export default Workspace;

