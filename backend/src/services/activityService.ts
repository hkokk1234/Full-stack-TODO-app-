import TaskActivity from "../models/TaskActivity";

type ActivityPayload = {
  taskId: string;
  projectId?: string | null;
  actorId: string;
  action:
    | "task_created"
    | "task_created_recurring"
    | "task_updated"
    | "task_deleted"
    | "task_assigned"
    | "comment_added"
    | "member_added"
    | "member_role_changed";
  details?: Record<string, unknown>;
};

export const logTaskActivity = async (payload: ActivityPayload): Promise<void> => {
  await TaskActivity.create({
    taskId: payload.taskId,
    projectId: payload.projectId ?? null,
    actorId: payload.actorId,
    action: payload.action,
    details: payload.details ?? {}
  });
};
