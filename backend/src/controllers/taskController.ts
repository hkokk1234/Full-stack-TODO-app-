import mongoose from "mongoose";
import type { Request, Response } from "express";
import ProjectMember from "../models/ProjectMember";
import WorkspaceMember from "../models/WorkspaceMember";
import Task from "../models/Task";
import { asyncHandler } from "../utils/asyncHandler";
import { createTaskSchema, listTaskSchema, updateTaskSchema } from "../validators.task";
import { canReadProject, canWriteProject, getProjectRole } from "../services/projectAccessService";
import { canReadWorkspace, canWriteWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";
import { logTaskActivity } from "../services/activityService";
import { emitTaskRealtime } from "../realtime/events";

const calculateProgressPercent = (subtasks: Array<{ done?: boolean }> = []): number => {
  if (!subtasks.length) return 0;
  const done = subtasks.filter((subtask) => subtask.done).length;
  return Math.round((done / subtasks.length) * 100);
};

const addRecurrence = (base: Date, frequency: "daily" | "weekly" | "monthly", interval: number): Date => {
  const next = new Date(base);
  if (frequency === "daily") next.setDate(next.getDate() + interval);
  if (frequency === "weekly") next.setDate(next.getDate() + 7 * interval);
  if (frequency === "monthly") next.setMonth(next.getMonth() + interval);
  return next;
};

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const query = listTaskSchema.parse(req.query);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const skip = (page - 1) * pageSize;

  const memberships = await ProjectMember.find({ userId }).select("projectId role").lean();
  const readableProjectIds = memberships.filter((m) => canReadProject(m.role)).map((m) => m.projectId);
  const workspaceMemberships = await WorkspaceMember.find({ userId }).select("workspaceId role").lean();
  const readableWorkspaceIds = workspaceMemberships.filter((m) => canReadWorkspace(m.role)).map((m) => m.workspaceId);

  const visibilityOr: Record<string, unknown>[] = [
    { userId: new mongoose.Types.ObjectId(userId) },
    { assigneeIds: new mongoose.Types.ObjectId(userId) },
    { "sharedWith.userId": new mongoose.Types.ObjectId(userId) }
  ];

  if (readableProjectIds.length > 0) {
    visibilityOr.push({ projectId: { $in: readableProjectIds } });
  }
  if (readableWorkspaceIds.length > 0) {
    visibilityOr.push({ workspaceId: { $in: readableWorkspaceIds } });
  }

  const filter: Record<string, unknown> = { $or: visibilityOr };

  if (query.workspaceId) {
    if (!mongoose.Types.ObjectId.isValid(query.workspaceId)) return res.status(400).json({ message: "Invalid workspaceId" });
    const workspaceRole = await getWorkspaceRole(query.workspaceId, userId);
    if (!canReadWorkspace(workspaceRole)) return res.status(403).json({ message: "Forbidden" });
    filter.workspaceId = new mongoose.Types.ObjectId(query.workspaceId);
  }

  if (query.projectId) {
    if (!mongoose.Types.ObjectId.isValid(query.projectId)) return res.status(400).json({ message: "Invalid projectId" });
    filter.projectId = new mongoose.Types.ObjectId(query.projectId);
  }

  if (query.assignedTo === "me") {
    filter.assigneeIds = new mongoose.Types.ObjectId(userId);
  }

  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.search) {
    filter.$and = [
      {
        $or: [
          { title: { $regex: query.search, $options: "i" } },
          { description: { $regex: query.search, $options: "i" } }
        ]
      }
    ];
  }

  const sortBy = query.sortBy ?? "createdAt";
  const sortOrder = query.sortOrder === "asc" ? 1 : -1;

  const sortMap: Record<string, 1 | -1> = {};
  if (sortBy === "priority") {
    sortMap.priority = sortOrder;
  } else if (sortBy === "title" || sortBy === "status" || sortBy === "dueDate") {
    sortMap[sortBy] = sortOrder;
  } else {
    sortMap.createdAt = sortOrder;
  }
  sortMap.createdAt = sortMap.createdAt ?? -1;

  const [items, total] = await Promise.all([
    Task.find(filter).sort(sortMap).skip(skip).limit(pageSize).lean(),
    Task.countDocuments(filter)
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return res.status(200).json({
    items: items.map((item) => ({
      ...item,
      progressPercent: calculateProgressPercent(item.subtasks as Array<{ done?: boolean }>)
    })),
    pagination: {
      page,
      pageSize,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const payload = createTaskSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  if (payload.projectId) {
    if (!mongoose.Types.ObjectId.isValid(payload.projectId)) return res.status(400).json({ message: "Invalid projectId" });
    const role = await getProjectRole(payload.projectId, userId);
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });
  }
  if (payload.workspaceId) {
    if (!mongoose.Types.ObjectId.isValid(payload.workspaceId)) return res.status(400).json({ message: "Invalid workspaceId" });
    const role = await getWorkspaceRole(payload.workspaceId, userId);
    if (!canWriteWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
  }

  const task = await Task.create({
    ...payload,
    workspaceId: payload.workspaceId ? new mongoose.Types.ObjectId(payload.workspaceId) : null,
    projectId: payload.projectId ? new mongoose.Types.ObjectId(payload.projectId) : null,
    assigneeIds: (payload.assigneeIds ?? []).filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id)),
    sharedWith: (payload.sharedWith ?? [])
      .filter((member) => mongoose.Types.ObjectId.isValid(member.userId))
      .map((member) => ({
        userId: new mongoose.Types.ObjectId(member.userId),
        permission: member.permission ?? "viewer"
      })),
    completedAt: payload.status === "done" ? new Date() : null,
    subtasks: (payload.subtasks ?? []).map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: Boolean(subtask.done)
    })),
    recurrence: {
      frequency: payload.recurrence?.frequency ?? "none",
      interval: payload.recurrence?.interval ?? 1
    },
    userId
  });

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: "task_created",
    details: { title: task.title }
  });

  emitTaskRealtime({ type: "task.created", taskId: String(task._id), payload: { actorId: userId } });
  return res.status(201).json({
    ...task.toObject(),
    progressPercent: calculateProgressPercent(task.subtasks)
  });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  const payload = updateTaskSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });
  const previousStatus = task.status;

  if (task.projectId) {
    const role = await getProjectRole(task.projectId, userId);
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });
  } else if (task.workspaceId) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    if (!canWriteWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
  } else {
    const sharePermission = task.sharedWith.find((member) => String(member.userId) === userId)?.permission;
    const canEditPersonal =
      String(task.userId) === userId ||
      (task.assigneeIds ?? []).some((a) => String(a) === userId) ||
      sharePermission === "editor";
    if (!canEditPersonal) return res.status(403).json({ message: "Forbidden" });
  }

  if (payload.workspaceId !== undefined) {
    if (payload.workspaceId && !mongoose.Types.ObjectId.isValid(payload.workspaceId)) {
      return res.status(400).json({ message: "Invalid workspaceId" });
    }
    if (payload.workspaceId) {
      const role = await getWorkspaceRole(payload.workspaceId, userId);
      if (!canWriteWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
    }
    task.workspaceId = payload.workspaceId ? new mongoose.Types.ObjectId(payload.workspaceId) : null;
  }

  if (payload.projectId !== undefined) {
    if (payload.projectId && !mongoose.Types.ObjectId.isValid(payload.projectId)) {
      return res.status(400).json({ message: "Invalid projectId" });
    }
    task.projectId = payload.projectId ? new mongoose.Types.ObjectId(payload.projectId) : null;
  }

  if (payload.assigneeIds !== undefined) {
    task.assigneeIds = payload.assigneeIds
      .filter((assigneeId) => mongoose.Types.ObjectId.isValid(assigneeId))
      .map((assigneeId) => new mongoose.Types.ObjectId(assigneeId));
  }

  if (payload.sharedWith !== undefined) {
    task.sharedWith = payload.sharedWith
      .filter((member) => mongoose.Types.ObjectId.isValid(member.userId))
      .map((member) => ({
        userId: new mongoose.Types.ObjectId(member.userId),
        permission: member.permission ?? "viewer"
      }));
  }

  if (payload.title !== undefined) task.title = payload.title;
  if (payload.description !== undefined) task.description = payload.description;
  if (payload.status !== undefined) {
    task.status = payload.status;
    if (payload.status === "done") {
      task.completedAt = task.completedAt ?? new Date();
    } else {
      task.completedAt = null;
    }
  }
  if (payload.priority !== undefined) task.priority = payload.priority;
  if (payload.dueDate !== undefined) task.dueDate = payload.dueDate;
  if (payload.subtasks !== undefined) {
    task.subtasks = payload.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      done: Boolean(subtask.done)
    }));
  }
  if (payload.recurrence !== undefined) {
    task.recurrence = {
      frequency: payload.recurrence.frequency ?? task.recurrence.frequency,
      interval: payload.recurrence.interval ?? task.recurrence.interval
    };
  }
  if (payload.linkedResource !== undefined) task.linkedResource = payload.linkedResource as typeof task.linkedResource;

  await task.save();

  if (previousStatus !== "done" && task.status === "done" && task.recurrence.frequency !== "none") {
    const recurrenceDateBase = task.dueDate ?? new Date();
    const nextDueDate = addRecurrence(recurrenceDateBase, task.recurrence.frequency, task.recurrence.interval);

    const recurringTask = await Task.create({
      userId: task.userId,
      workspaceId: task.workspaceId,
      projectId: task.projectId,
      assigneeIds: task.assigneeIds,
      title: task.title,
      description: task.description,
      status: "todo",
      completedAt: null,
      priority: task.priority,
      dueDate: nextDueDate,
      subtasks: task.subtasks.map((subtask) => ({ ...subtask, done: false })),
      recurrence: task.recurrence,
      linkedResource: task.linkedResource
    });

    await logTaskActivity({
      taskId: String(recurringTask._id),
      projectId: recurringTask.projectId ? String(recurringTask.projectId) : null,
      actorId: userId,
      action: "task_created_recurring",
      details: { parentTaskId: String(task._id) }
    });

    emitTaskRealtime({
      type: "task.created",
      taskId: String(recurringTask._id),
      payload: { actorId: userId, recurring: true }
    });
  }

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: payload.assigneeIds ? "task_assigned" : "task_updated",
    details: { updatedFields: Object.keys(payload) }
  });

  emitTaskRealtime({
    type: payload.assigneeIds ? "assignment.updated" : "task.updated",
    taskId: String(task._id),
    payload: { actorId: userId, updatedFields: Object.keys(payload) }
  });

  return res.status(200).json({
    ...task.toObject(),
    progressPercent: calculateProgressPercent(task.subtasks)
  });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid task id" });

  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (task.projectId) {
    const role = await getProjectRole(task.projectId, userId);
    if (!canWriteProject(role)) return res.status(403).json({ message: "Forbidden" });
  } else if (task.workspaceId) {
    const role = await getWorkspaceRole(task.workspaceId, userId);
    if (!canWriteWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
  } else if (String(task.userId) !== userId) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await Task.deleteOne({ _id: task._id });

  await logTaskActivity({
    taskId: String(task._id),
    projectId: task.projectId ? String(task.projectId) : null,
    actorId: userId,
    action: "task_deleted",
    details: { title: task.title }
  });

  emitTaskRealtime({ type: "task.deleted", taskId: String(task._id), payload: { actorId: userId } });

  return res.status(204).send();
});
