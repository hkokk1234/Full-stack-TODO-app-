import mongoose from "mongoose";
import type { Request, Response } from "express";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify as stringifyCsv } from "csv-stringify/sync";
import ProjectMember from "../models/ProjectMember";
import WorkspaceMember from "../models/WorkspaceMember";
import Task, { type TaskPriority, type TaskStatus } from "../models/Task";
import { asyncHandler } from "../utils/asyncHandler";
import { canReadProject, canWriteProject, getProjectRole } from "../services/projectAccessService";
import { canReadWorkspace, canWriteWorkspace, getWorkspaceRole } from "../services/workspaceAccessService";

type TransferFormat = "csv" | "json";

type ImportedTaskRow = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  workspaceId?: string;
  projectId?: string;
  assigneeIds?: string;
  subtasks?: string;
  recurrenceFrequency?: string;
  recurrenceInterval?: string;
  linkedResourceTitle?: string;
  linkedResourceUrl?: string;
};

type RawRow = Record<string, unknown>;

const validStatuses: TaskStatus[] = ["todo", "in_progress", "done"];
const validPriorities: TaskPriority[] = ["low", "medium", "high"];
const validRecurrence = ["none", "daily", "weekly", "monthly"] as const;
type RecurrenceFrequency = (typeof validRecurrence)[number];

const normalizeKey = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const aliases = {
  title: ["title", "task", "content", "name", "subject"],
  description: ["description", "notes", "details", "body", "comment"],
  status: ["status", "completed", "iscompleted", "checked", "percentcomplete"],
  priority: ["priority", "importance", "p1", "p2", "p3", "p4"],
  dueDate: ["duedate", "due", "date", "deadline", "startdate"],
  workspaceId: ["workspaceid", "workspace"],
  projectId: ["projectid", "project"],
  assigneeIds: ["assigneeids", "assignees", "assignee", "responsible"],
  subtasks: ["subtasks", "checklist"],
  recurrenceFrequency: ["recurrencefrequency", "recurrence", "repeat"],
  recurrenceInterval: ["recurrenceinterval", "interval"],
  linkedResourceTitle: ["linkedresourcetitle", "linktitle", "resourcetitle"],
  linkedResourceUrl: ["linkedresourceurl", "url", "link", "website"]
} as const;

const readFormat = (req: Request): TransferFormat => {
  const raw = (req.query.format as string | undefined)?.toLowerCase();
  if (raw === "json") return "json";
  return "csv";
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const safeStatus = (value?: string): TaskStatus => {
  const parsed = (value ?? "").toLowerCase() as TaskStatus;
  return validStatuses.includes(parsed) ? parsed : "todo";
};

const safePriority = (value?: string): TaskPriority => {
  const parsed = (value ?? "").toLowerCase() as TaskPriority;
  return validPriorities.includes(parsed) ? parsed : "medium";
};

const safeRecurrenceFrequency = (value?: string): RecurrenceFrequency => {
  const parsed = (value ?? "").toLowerCase() as RecurrenceFrequency;
  return validRecurrence.includes(parsed) ? parsed : "none";
};

const readAlias = (row: RawRow, list: readonly string[]): string => {
  const byKey = new Map<string, string>();
  Object.entries(row).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    byKey.set(normalizeKey(key), String(value));
  });
  for (const alias of list) {
    const found = byKey.get(normalizeKey(alias));
    if (found !== undefined && found !== "") return found;
  }
  return "";
};

const statusFromCompat = (row: RawRow): string => {
  const rawStatus = readAlias(row, aliases.status).toLowerCase();
  if (!rawStatus) return "";
  if (["done", "completed", "complete", "true", "yes", "checked"].includes(rawStatus)) return "done";
  if (["inprogress", "in_progress", "progress", "started"].includes(rawStatus)) return "in_progress";
  if (rawStatus === "100") return "done";
  return "todo";
};

const priorityFromCompat = (row: RawRow): string => {
  const raw = readAlias(row, aliases.priority).toLowerCase();
  if (!raw) return "";
  if (["high", "urgent", "important"].includes(raw)) return "high";
  if (["low", "minor"].includes(raw)) return "low";
  if (["normal", "medium"].includes(raw)) return "medium";
  const numeric = Number(raw);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 4) return "high";
    if (numeric <= 1) return "low";
    return "medium";
  }
  return raw;
};

const compatNormalizeRow = (row: RawRow): ImportedTaskRow => {
  return {
    title: readAlias(row, aliases.title),
    description: readAlias(row, aliases.description),
    status: statusFromCompat(row) || readAlias(row, aliases.status),
    priority: priorityFromCompat(row) || readAlias(row, aliases.priority),
    dueDate: readAlias(row, aliases.dueDate),
    workspaceId: readAlias(row, aliases.workspaceId),
    projectId: readAlias(row, aliases.projectId),
    assigneeIds: readAlias(row, aliases.assigneeIds),
    subtasks: readAlias(row, aliases.subtasks),
    recurrenceFrequency: readAlias(row, aliases.recurrenceFrequency),
    recurrenceInterval: readAlias(row, aliases.recurrenceInterval),
    linkedResourceTitle: readAlias(row, aliases.linkedResourceTitle),
    linkedResourceUrl: readAlias(row, aliases.linkedResourceUrl)
  };
};

const visibilityFilter = async (userId: string): Promise<Record<string, unknown>> => {
  const memberships = await ProjectMember.find({ userId }).select("projectId role").lean();
  const readableProjectIds = memberships.filter((m) => canReadProject(m.role)).map((m) => m.projectId);
  const workspaceMemberships = await WorkspaceMember.find({ userId }).select("workspaceId role").lean();
  const readableWorkspaceIds = workspaceMemberships.filter((m) => canReadWorkspace(m.role)).map((m) => m.workspaceId);

  const visibilityOr: Record<string, unknown>[] = [
    { userId: new mongoose.Types.ObjectId(userId) },
    { assigneeIds: new mongoose.Types.ObjectId(userId) },
    { "sharedWith.userId": new mongoose.Types.ObjectId(userId) }
  ];
  if (readableWorkspaceIds.length > 0) visibilityOr.push({ workspaceId: { $in: readableWorkspaceIds } });
  if (readableProjectIds.length > 0) visibilityOr.push({ projectId: { $in: readableProjectIds } });
  return { $or: visibilityOr };
};

export const exportTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const format = readFormat(req);
  const filter = await visibilityFilter(userId);
  const items = await Task.find(filter).sort({ createdAt: -1 }).lean();

  const normalized = items.map((task) => ({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
    workspaceId: task.workspaceId ? String(task.workspaceId) : "",
    projectId: task.projectId ? String(task.projectId) : "",
    assigneeIds: (task.assigneeIds ?? []).map((id) => String(id)).join(","),
    subtasks: JSON.stringify(task.subtasks ?? []),
    recurrenceFrequency: task.recurrence?.frequency ?? "none",
    recurrenceInterval: String(task.recurrence?.interval ?? 1),
    linkedResourceTitle: task.linkedResource?.title ?? "",
    linkedResourceUrl: task.linkedResource?.url ?? ""
  }));

  if (format === "json") {
    res.setHeader("Content-Disposition", 'attachment; filename="tasks-export.json"');
    return res.status(200).json({ items: normalized });
  }

  const csv = stringifyCsv(normalized, {
    header: true,
    columns: [
      "title",
      "description",
      "status",
      "priority",
      "dueDate",
      "workspaceId",
      "projectId",
      "assigneeIds",
      "subtasks",
      "recurrenceFrequency",
      "recurrenceInterval",
      "linkedResourceTitle",
      "linkedResourceUrl"
    ]
  });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="tasks-export.csv"');
  return res.status(200).send(csv);
});

const parseRowsFromRequest = (req: Request, format: TransferFormat): ImportedTaskRow[] => {
  if (format === "json") {
    if (Array.isArray(req.body?.items)) return (req.body.items as RawRow[]).map(compatNormalizeRow);
    if (Array.isArray(req.body)) return (req.body as RawRow[]).map(compatNormalizeRow);
    if (req.file?.buffer) {
      const parsed = JSON.parse(req.file.buffer.toString("utf8")) as RawRow[] | { items: RawRow[] };
      if (Array.isArray(parsed)) return parsed.map(compatNormalizeRow);
      if (Array.isArray(parsed.items)) return parsed.items.map(compatNormalizeRow);
    }
    return [];
  }

  if (!req.file?.buffer) return [];
  const rows = parseCsv(req.file.buffer.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as RawRow[];
  return rows.map(compatNormalizeRow);
};

export const importTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const format = readFormat(req);
  const rows = parseRowsFromRequest(req, format);
  if (!rows.length) return res.status(400).json({ message: "No rows to import" });

  let created = 0;
  let skipped = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNo = index + 1;
    const title = (row.title ?? "").trim();
    if (!title) {
      skipped += 1;
      errors.push({ row: rowNo, reason: "Missing title" });
      continue;
    }

    let workspaceId: mongoose.Types.ObjectId | null = null;
    if (row.workspaceId && mongoose.Types.ObjectId.isValid(row.workspaceId)) {
      const role = await getWorkspaceRole(row.workspaceId, userId);
      if (canWriteWorkspace(role)) {
        workspaceId = new mongoose.Types.ObjectId(row.workspaceId);
      }
    }

    let projectId: mongoose.Types.ObjectId | null = null;
    if (row.projectId && mongoose.Types.ObjectId.isValid(row.projectId)) {
      const role = await getProjectRole(row.projectId, userId);
      if (canWriteProject(role)) {
        projectId = new mongoose.Types.ObjectId(row.projectId);
      }
    }

    const assigneeIds = (row.assigneeIds ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    let subtasks: Array<{ id: string; title: string; done: boolean }> = [];
    if (row.subtasks) {
      try {
        const parsed = JSON.parse(row.subtasks) as Array<{ id?: string; title?: string; done?: boolean }>;
        if (Array.isArray(parsed)) {
          subtasks = parsed
            .filter((item) => typeof item.title === "string" && item.title.trim().length > 0)
            .map((item) => ({
              id: item.id || globalThis.crypto.randomUUID(),
              title: String(item.title).trim(),
              done: Boolean(item.done)
            }));
        }
      } catch {
        // ignore invalid subtasks payload
      }
    }

    await Task.create({
      userId: new mongoose.Types.ObjectId(userId),
      workspaceId,
      projectId,
      assigneeIds,
      title,
      description: (row.description ?? "").trim(),
      status: safeStatus(row.status),
      priority: safePriority(row.priority),
      dueDate: parseDate(row.dueDate),
      completedAt: safeStatus(row.status) === "done" ? new Date() : null,
      subtasks,
      recurrence: {
        frequency: safeRecurrenceFrequency(row.recurrenceFrequency),
        interval: Math.max(1, Number(row.recurrenceInterval ?? 1))
      },
      linkedResource: row.linkedResourceTitle || row.linkedResourceUrl
        ? { title: row.linkedResourceTitle ?? "", url: row.linkedResourceUrl ?? "" }
        : null
    });
    created += 1;
  }

  return res.status(201).json({
    message: "Import completed",
    created,
    skipped,
    errors: errors.slice(0, 50)
  });
});
