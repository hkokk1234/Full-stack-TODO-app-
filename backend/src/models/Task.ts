import mongoose, { Schema } from "mongoose";

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type LinkedResource = {
  title: string;
  url: string;
};

export type TaskSubtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  provider: "local" | "s3" | "cloudinary";
  storageKey: string;
  createdAt: Date;
};

export type TaskSharePermission = "viewer" | "editor";

export type TaskShareMember = {
  userId: mongoose.Types.ObjectId;
  permission: TaskSharePermission;
};

export type TaskRecurrence = {
  frequency: "none" | "daily" | "weekly" | "monthly";
  interval: number;
};

export type TaskSource = {
  provider: "microsoft_todo";
  listId: string;
  taskId: string;
  listTitle?: string;
};

export type TaskDocument = {
  userId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId | null;
  projectId: mongoose.Types.ObjectId | null;
  assigneeIds: mongoose.Types.ObjectId[];
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date | null;
  completedAt: Date | null;
  subtasks: TaskSubtask[];
  attachments: TaskAttachment[];
  sharedWith: TaskShareMember[];
  recurrence: TaskRecurrence;
  linkedResource: LinkedResource | null;
  source: TaskSource | null;
  createdAt: Date;
  updatedAt: Date;
};

const linkedResourceSchema = new Schema<LinkedResource>(
  {
    title: { type: String, trim: true, maxlength: 120, default: "" },
    url: { type: String, trim: true, maxlength: 500, default: "" }
  },
  { _id: false }
);

const sourceSchema = new Schema<TaskSource>(
  {
    provider: { type: String, enum: ["microsoft_todo"], required: true },
    listId: { type: String, required: true },
    taskId: { type: String, required: true },
    listTitle: { type: String, default: "" }
  },
  { _id: false }
);

const subtaskSchema = new Schema<TaskSubtask>(
  {
    id: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    done: { type: Boolean, default: false }
  },
  { _id: false }
);

const recurrenceSchema = new Schema<TaskRecurrence>(
  {
    frequency: { type: String, enum: ["none", "daily", "weekly", "monthly"], default: "none" },
    interval: { type: Number, min: 1, max: 365, default: 1 }
  },
  { _id: false }
);

const attachmentSchema = new Schema<TaskAttachment>(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 300 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
    mimeType: { type: String, required: true, trim: true, maxlength: 120 },
    size: { type: Number, required: true, min: 0 },
    provider: { type: String, enum: ["local", "s3", "cloudinary"], default: "local" },
    storageKey: { type: String, required: true, trim: true, maxlength: 1500 },
    createdAt: { type: Date, default: () => new Date() }
  },
  { _id: false }
);

const shareMemberSchema = new Schema<TaskShareMember>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    permission: { type: String, enum: ["viewer", "editor"], default: "viewer" }
  },
  { _id: false }
);

const taskSchema = new Schema<TaskDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: "Workspace", default: null, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null, index: true },
    assigneeIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", index: true }],
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo", index: true },
    priority: { type: String, enum: ["low", "medium", "high"], default: "medium", index: true },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null, index: true },
    subtasks: { type: [subtaskSchema], default: [] },
    attachments: { type: [attachmentSchema], default: [] },
    sharedWith: { type: [shareMemberSchema], default: [] },
    recurrence: { type: recurrenceSchema, default: { frequency: "none", interval: 1 } },
    linkedResource: { type: linkedResourceSchema, default: null },
    source: { type: sourceSchema, default: null }
  },
  { timestamps: true }
);

taskSchema.index({ userId: 1, createdAt: -1 });
taskSchema.index({ assigneeIds: 1, createdAt: -1 });
taskSchema.index({ workspaceId: 1, createdAt: -1 });
taskSchema.index({ projectId: 1, createdAt: -1 });
taskSchema.index(
  { userId: 1, "source.provider": 1, "source.taskId": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "source.provider": { $exists: true },
      "source.taskId": { $exists: true }
    }
  }
);

const Task = mongoose.model<TaskDocument>("Task", taskSchema);

export default Task;
