import mongoose, { Schema } from "mongoose";

export type TaskCommentDocument = {
  taskId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId | null;
  authorId: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

const taskCommentSchema = new Schema<TaskCommentDocument>(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, required: true, trim: true, maxlength: 1200 }
  },
  { timestamps: true }
);

taskCommentSchema.index({ taskId: 1, createdAt: -1 });

const TaskComment = mongoose.model<TaskCommentDocument>("TaskComment", taskCommentSchema);

export default TaskComment;
