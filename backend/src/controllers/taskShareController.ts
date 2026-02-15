import mongoose from "mongoose";
import type { Request, Response } from "express";
import Task from "../models/Task";
import User from "../models/User";
import { asyncHandler } from "../utils/asyncHandler";
import { shareTaskSchema } from "../validators.task";
import { emitTaskRealtime } from "../realtime/events";
import { logTaskActivity } from "../services/activityService";
import { canReadWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";

const mustBeOwnerForPersonal = (taskUserId: mongoose.Types.ObjectId, userId: string): boolean =>
  String(taskUserId) === userId;

export const listTaskShares = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  const task = await Task.findById(id).lean();
  if (!task) return res.status(404).json({ message: "Task not found" });

  const canView =
    String(task.userId) === userId ||
    (task.assigneeIds ?? []).some((assignee) => String(assignee) === userId) ||
    (task.sharedWith ?? []).some((member) => String(member.userId) === userId);

  if (task.workspaceId && !canView) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    if (canReadWorkspace(role)) {
      const userIds = (task.sharedWith ?? []).map((member) => member.userId);
      const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
      const userMap = new Map(users.map((u) => [String(u._id), u]));
      return res.status(200).json({
        items: (task.sharedWith ?? []).map((member) => ({
          userId: String(member.userId),
          permission: member.permission,
          name: userMap.get(String(member.userId))?.name ?? "",
          email: userMap.get(String(member.userId))?.email ?? ""
        }))
      });
    }
  }

  if (!canView) return res.status(403).json({ message: "Forbidden" });

  const userIds = (task.sharedWith ?? []).map((member) => member.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("name email").lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  return res.status(200).json({
    items: (task.sharedWith ?? []).map((member) => ({
      userId: String(member.userId),
      permission: member.permission,
      name: userMap.get(String(member.userId))?.name ?? "",
      email: userMap.get(String(member.userId))?.email ?? ""
    }))
  });
});

export const shareTaskWithUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (task.projectId) return res.status(400).json({ message: "Use project members for project tasks" });
  if (task.workspaceId) return res.status(400).json({ message: "Use workspace members for workspace tasks" });
  if (!mustBeOwnerForPersonal(task.userId, userId)) return res.status(403).json({ message: "Only task owner can share" });

  const payload = shareTaskSchema.parse(req.body);
  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) return res.status(404).json({ message: "User not found" });
  if (String(user._id) === String(task.userId)) return res.status(400).json({ message: "Owner already has access" });

  const permission = payload.permission ?? "viewer";
  const existing = task.sharedWith.find((member) => String(member.userId) === String(user._id));
  if (existing) {
    existing.permission = permission;
  } else {
    task.sharedWith.push({ userId: user._id, permission });
  }
  await task.save();

  await logTaskActivity({
    taskId: String(task._id),
    projectId: null,
    actorId: userId,
    action: "task_updated",
    details: { updatedFields: ["sharedWith"], sharedUserId: String(user._id), permission }
  });
  emitTaskRealtime({ type: "task.updated", taskId: String(task._id), payload: { updatedFields: ["sharedWith"] } });

  return res.status(200).json({
    userId: String(user._id),
    name: user.name,
    email: user.email,
    permission
  });
});

export const removeTaskShare = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { id, memberUserId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(memberUserId)) {
    return res.status(400).json({ message: "Invalid ids" });
  }

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  if (task.projectId) return res.status(400).json({ message: "Use project members for project tasks" });
  if (task.workspaceId) return res.status(400).json({ message: "Use workspace members for workspace tasks" });
  if (!mustBeOwnerForPersonal(task.userId, userId)) return res.status(403).json({ message: "Only task owner can unshare" });

  const before = task.sharedWith.length;
  task.sharedWith = task.sharedWith.filter((member) => String(member.userId) !== memberUserId);
  if (task.sharedWith.length === before) return res.status(404).json({ message: "Share member not found" });
  await task.save();

  await logTaskActivity({
    taskId: String(task._id),
    projectId: null,
    actorId: userId,
    action: "task_updated",
    details: { updatedFields: ["sharedWith"], removedUserId: memberUserId }
  });
  emitTaskRealtime({ type: "task.updated", taskId: String(task._id), payload: { updatedFields: ["sharedWith"] } });

  return res.status(204).send();
});
