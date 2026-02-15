import mongoose, { Schema } from "mongoose";

export type ProjectDocument = {
  name: string;
  description: string;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

const projectSchema = new Schema<ProjectDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }
  },
  { timestamps: true }
);

projectSchema.index({ ownerId: 1, createdAt: -1 });

const Project = mongoose.model<ProjectDocument>("Project", projectSchema);

export default Project;
