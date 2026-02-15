import mongoose, { Schema } from "mongoose";

export type TaskActivityAction =
  | "task_created"
  | "task_created_recurring"
  | "task_updated"
  | "task_deleted"
  | "task_assigned"
  | "comment_added"
  | "member_added"
  | "member_role_changed";

export type TaskActivityDocument = {
  taskId: mongoose.Types.ObjectId;
  projectId: mongoose.Types.ObjectId | null;
  actorId: mongoose.Types.ObjectId;
  action: TaskActivityAction;
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

const taskActivitySchema = new Schema<TaskActivityDocument>(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: {
      type: String,
      enum: ["task_created", "task_created_recurring", "task_updated", "task_deleted", "task_assigned", "comment_added", "member_added", "member_role_changed"],
      required: true
    },
    details: { type: Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

taskActivitySchema.index({ taskId: 1, createdAt: -1 });

const TaskActivity = mongoose.model<TaskActivityDocument>("TaskActivity", taskActivitySchema);

export default TaskActivity;
