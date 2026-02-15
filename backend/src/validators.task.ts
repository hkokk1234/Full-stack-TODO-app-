import { z } from "zod";

const linkedResourceSchema = z
  .object({
    title: z.string().max(120).optional(),
    url: z.union([z.string().url().max(500), z.literal("")]).optional()
  })
  .optional();

const sourceSchema = z
  .object({
    provider: z.literal("microsoft_todo"),
    listId: z.string().min(1),
    taskId: z.string().min(1),
    listTitle: z.string().max(120).optional()
  })
  .optional();

const subtaskSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  done: z.boolean().optional()
});

const recurrenceSchema = z
  .object({
    frequency: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
    interval: z.coerce.number().int().min(1).max(365).optional()
  })
  .optional();

const shareMemberSchema = z.object({
  userId: z.string(),
  permission: z.enum(["viewer", "editor"]).optional()
});

export const createTaskSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  assigneeIds: z.array(z.string()).max(20).optional(),
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  subtasks: z.array(subtaskSchema).max(100).optional(),
  sharedWith: z.array(shareMemberSchema).max(50).optional(),
  recurrence: recurrenceSchema,
  linkedResource: linkedResourceSchema,
  source: sourceSchema
});

export const updateTaskSchema = createTaskSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required"
});

export const listTaskSchema = z.object({
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  assignedTo: z.enum(["me"]).optional(),
  status: z.enum(["todo", "in_progress", "done"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  search: z.string().max(120).optional(),
  sortBy: z.enum(["createdAt", "dueDate", "priority", "title", "status"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional()
});

export const shareTaskSchema = z.object({
  email: z.string().email(),
  permission: z.enum(["viewer", "editor"]).optional()
});
