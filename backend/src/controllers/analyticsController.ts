import mongoose from "mongoose";
import type { Request, Response } from "express";
import Task from "../models/Task";
import { asyncHandler } from "../utils/asyncHandler";
import { canReadWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";

const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const startOfWeek = (date: Date): Date => {
  const current = startOfDay(date);
  const diff = (current.getDay() + 6) % 7;
  current.setDate(current.getDate() - diff);
  return current;
};

export const analyticsSummary = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const workspaceIdQuery = typeof req.query.workspaceId === "string" ? req.query.workspaceId : "";
  if (workspaceIdQuery && !mongoose.Types.ObjectId.isValid(workspaceIdQuery)) {
    return res.status(400).json({ message: "Invalid workspaceId" });
  }
  if (workspaceIdQuery) {
    const role = await getWorkspaceRole(workspaceIdQuery, userId);
    if (!canReadWorkspace(role)) return res.status(403).json({ message: "Forbidden" });
  }

  const now = new Date();
  const userFilter: Record<string, unknown> = { userId: new mongoose.Types.ObjectId(userId) };
  if (workspaceIdQuery) userFilter.workspaceId = new mongoose.Types.ObjectId(workspaceIdQuery);
  const [total, done, overdue, createdRecent, completedRecent] = await Promise.all([
    Task.countDocuments(userFilter),
    Task.countDocuments({ ...userFilter, status: "done" }),
    Task.countDocuments({ ...userFilter, status: { $ne: "done" }, dueDate: { $lt: now } }),
    Task.find({ ...userFilter, createdAt: { $gte: addDays(now, -62) } }).select("createdAt").lean(),
    Task.find({ ...userFilter, completedAt: { $ne: null, $gte: addDays(now, -62) } }).select("completedAt").lean()
  ]);

  const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;

  const overdueTrend = Array.from({ length: 14 }).map((_, idx) => {
    const dayStart = startOfDay(addDays(now, idx - 13));
    return {
      date: dayStart.toISOString().slice(0, 10),
      count: 0
    };
  });

  // Overdue trend based on dueDate bucket for currently open overdue tasks.
  const overdueTasks = await Task.find({
    ...userFilter,
    status: { $ne: "done" },
    dueDate: { $ne: null, $lte: now, $gte: addDays(now, -13) }
  })
    .select("dueDate")
    .lean();
  const overdueMap = new Map<string, number>();
  for (const task of overdueTasks) {
    if (!task.dueDate) continue;
    const key = startOfDay(new Date(task.dueDate)).toISOString().slice(0, 10);
    overdueMap.set(key, (overdueMap.get(key) ?? 0) + 1);
  }
  for (const point of overdueTrend) {
    point.count = overdueMap.get(point.date) ?? 0;
  }

  const productivityWeekly = Array.from({ length: 8 }).map((_, idx) => {
    const weekStart = startOfWeek(addDays(now, (idx - 7) * 7));
    const weekEnd = addDays(weekStart, 7);
    return {
      weekStart: weekStart.toISOString().slice(0, 10),
      created: createdRecent.filter((t) => t.createdAt >= weekStart && t.createdAt < weekEnd).length,
      completed: completedRecent.filter((t) => t.completedAt && t.completedAt >= weekStart && t.completedAt < weekEnd).length
    };
  });

  const productivityMonthly = Array.from({ length: 6 }).map((_, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return {
      month: monthStart.toISOString().slice(0, 7),
      created: createdRecent.filter((t) => t.createdAt >= monthStart && t.createdAt < monthEnd).length,
      completed: completedRecent.filter((t) => t.completedAt && t.completedAt >= monthStart && t.completedAt < monthEnd).length
    };
  });

  return res.status(200).json({
    totals: {
      total,
      done,
      overdue,
      active: Math.max(0, total - done)
    },
    completionRate,
    overdueTrend,
    productivityWeekly,
    productivityMonthly
  });
});
