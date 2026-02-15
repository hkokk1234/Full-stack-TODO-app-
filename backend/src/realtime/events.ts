import { getIo } from "./io";

type TaskRealtimeEvent = {
  type: "task.created" | "task.updated" | "task.deleted" | "comment.created" | "activity.created" | "assignment.updated";
  taskId: string;
  payload?: Record<string, unknown>;
};

type NotificationRealtimeEvent = {
  type: "notification.created" | "notification.read" | "notification.read_all";
  notificationId?: string;
  userId: string;
  payload?: Record<string, unknown>;
};

export const emitTaskRealtime = (event: TaskRealtimeEvent): void => {
  const io = getIo();
  if (!io) return;

  io.to(`task:${event.taskId}`).emit("task:event", event);
  io.emit("workspace:event", event);
};

export const emitNotificationRealtime = (event: NotificationRealtimeEvent): void => {
  const io = getIo();
  if (!io) return;

  io.to(`user:${event.userId}`).emit("notification:event", event);
};
