import mongoose, { Schema } from "mongoose";

export type NotificationType = "due_soon";

export type NotificationDocument = {
  userId: mongoose.Types.ObjectId;
  taskId: mongoose.Types.ObjectId | null;
  type: NotificationType;
  title: string;
  message: string;
  dueAt: Date | null;
  readAt: Date | null;
  emailedAt: Date | null;
  emailAttemptCount: number;
  nextEmailAttemptAt: Date | null;
  lastEmailError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const notificationSchema = new Schema<NotificationDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", default: null, index: true },
    type: { type: String, enum: ["due_soon"], required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    dueAt: { type: Date, default: null, index: true },
    readAt: { type: Date, default: null, index: true },
    emailedAt: { type: Date, default: null, index: true },
    emailAttemptCount: { type: Number, default: 0, min: 0 },
    nextEmailAttemptAt: { type: Date, default: null, index: true },
    lastEmailError: { type: String, default: null, maxlength: 500 }
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, taskId: 1, dueAt: 1 }, { unique: true, sparse: true });

const Notification = mongoose.model<NotificationDocument>("Notification", notificationSchema);

export default Notification;
