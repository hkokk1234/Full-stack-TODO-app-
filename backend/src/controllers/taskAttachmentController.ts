import mongoose from "mongoose";
import type { Request, Response } from "express";
import Task, { type TaskDocument } from "../models/Task";
import { canWriteProject, getProjectRole } from "../services/projectAccessService";
import { canWriteWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";
import { asyncHandler } from "../utils/asyncHandler";
import { storeAttachment, removeAttachment } from "../services/storageService";
import { logTaskActivity } from "../services/activityService";
import { emitTaskRealtime } from "../realtime/events";

const canEditTask = async (task: mongoose.HydratedDocument<TaskDocument> | null, userId: string): Promise<boolean> => {
  if (!task) return false;
  if (task.projectId) {
    const role = await getProjectRole(task.projectId, userId);
    return canWriteProject(role);
  }
  if (task.workspaceId) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    return canWriteWorkspace(role);
  }
  return String(task.userId) === userId || (task.assigneeIds ?? []).some((a) => String(a) === userId);
};

export const uploadTaskAttachment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  if (!req.file) return res.status(400).json({ message: "Missing file" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canEditTask(task, userId))) return res.status(403).json({ message: "Forbidden" });

  const attachment = await storeAttachment(req.file);
  task.attachments.push(attachment);
  await task.save();

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: "task_updated",
    details: { updatedFields: ["attachments"], attachmentId: attachment.id }
  });

  emitTaskRealtime({
    type: "task.updated",
    taskId: String(task._id),
    payload: { actorId: userId, updatedFields: ["attachments"] }
  });

  return res.status(201).json(attachment);
});

export const deleteTaskAttachment = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id, attachmentId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (!(await canEditTask(task, userId))) return res.status(403).json({ message: "Forbidden" });

  const attachment = task.attachments.find((item) => item.id === attachmentId);
  if (!attachment) return res.status(404).json({ message: "Attachment not found" });

  task.attachments = task.attachments.filter((item) => item.id !== attachmentId);
  await task.save();
  await removeAttachment(attachment.storageKey, attachment.provider);

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: "task_updated",
    details: { updatedFields: ["attachments"], attachmentId }
  });

  emitTaskRealtime({
    type: "task.updated",
    taskId: String(task._id),
    payload: { actorId: userId, updatedFields: ["attachments"] }
  });

  return res.status(204).send();
});
