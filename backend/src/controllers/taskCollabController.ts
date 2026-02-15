import mongoose from "mongoose";
import type { Request, Response } from "express";
import Task from "../models/Task";
import TaskActivity from "../models/TaskActivity";
import TaskComment from "../models/TaskComment";
import { asyncHandler } from "../utils/asyncHandler";
import { createCommentSchema } from "../validators.comment";
import { canReadProject, canWriteProject, getProjectRole } from "../services/projectAccessService";
import { canReadWorkspace, canWriteWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";
import { logTaskActivity } from "../services/activityService";
import { emitTaskRealtime } from "../realtime/events";

const resolveTaskForUser = async (taskId: string, userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(taskId)) return null;

  const task = await Task.findById(taskId);
  if (!task) return null;

  const isCreator = String(task.userId) === userId;
  const isAssignee = (task.assigneeIds ?? []).some((id) => String(id) === userId);
  const isShared = (task.sharedWith ?? []).some((member) => String(member.userId) === userId);

  if (task.projectId) {
    const role = await getProjectRole(task.projectId, userId);
    if (!canReadProject(role)) return null;
    return task;
  }

  if (task.workspaceId) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    if (!canReadWorkspace(role)) return null;
    return task;
  }

  return isCreator || isAssignee || isShared ? task : null;
};

export const listTaskComments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await resolveTaskForUser(req.params.id, userId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const comments = await TaskComment.find({ taskId: task._id })
    .populate("authorId", "name email")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({ items: comments });
});

export const createTaskComment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await resolveTaskForUser(req.params.id, userId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (task.projectId) {
    const role = await getProjectRole(task.projectId, userId);
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });
  } else if (task.workspaceId) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    if (!canWriteWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
  }

  const payload = createCommentSchema.parse(req.body);

  const comment = await TaskComment.create({
    taskId: task._id,
    projectId: task.projectId ?? null,
    authorId: userId,
    body: payload.body
  });

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: "comment_added",
    details: { bodyPreview: payload.body.slice(0, 80) }
  });

  emitTaskRealtime({ type: "comment.created", taskId: String(task._id), payload: { actorId: userId } });
  emitTaskRealtime({ type: "activity.created", taskId: String(task._id), payload: { actorId: userId } });

  return res.status(201).json(comment);
});

export const listTaskActivity = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await resolveTaskForUser(req.params.id, userId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const activity = await TaskActivity.find({ taskId: task._id })
    .populate("actorId", "name email")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return res.status(200).json({ items: activity });
});

export const assignTaskToMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await resolveTaskForUser(req.params.id, userId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  const current = task.assigneeIds ?? [];
  const alreadyAssigned = current.some((id) => String(id) === userId);

  if (!alreadyAssigned) {
    current.push(new mongoose.Types.ObjectId(userId));
    task.assigneeIds = current;
    await task.save();

    await logTaskActivity({
      taskId: String(task._id),
      projectId: task.projectId ? String(task.projectId) : null,
      actorId: userId,
      action: "task_assigned",
      details: { assigneeId: userId }
    });

    emitTaskRealtime({ type: "assignment.updated", taskId: String(task._id), payload: { assigneeId: userId } });
    emitTaskRealtime({ type: "activity.created", taskId: String(task._id), payload: { actorId: userId } });
  }

  return res.status(200).json(task);
});

export const unassignTaskFromMe = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await resolveTaskForUser(req.params.id, userId);
  if (!task) return res.status(404).json({ message: "Task not found" });

  task.assigneeIds = (task.assigneeIds ?? []).filter((id) => String(id) !== userId);
  await task.save();

  emitTaskRealtime({ type: "assignment.updated", taskId: String(task._id), payload: { assigneeId: userId } });

  return res.status(200).json(task);
});
