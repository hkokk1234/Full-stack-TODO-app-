import type { Request, Response } from "express";
import Task from "../models/Task";
import { asyncHandler } from "../utils/asyncHandler";
import { microsoftImportSchema, microsoftListTasksSchema, microsoftTokenSchema } from "../validators.integration";
import { fetchListTasks, fetchTodoLists, mapGraphPriority, mapGraphStatus, normalizeDate, pickLinkedResource } from "../services/microsoftTodoService";

export const microsoftLists = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken } = microsoftTokenSchema.parse(req.body);
  const lists = await fetchTodoLists(accessToken);
  return res.status(200).json({ items: lists });
});

export const microsoftListTasks = asyncHandler(async (req: Request, res: Response) => {
  const { listId } = req.params;
  const { accessToken, maxItems } = microsoftListTasksSchema.parse(req.body);
  const tasks = await fetchListTasks(accessToken, listId, maxItems ?? 30);
  return res.status(200).json({ items: tasks });
});

export const microsoftImportTasks = asyncHandler(async (req: Request, res: Response) => {
  const { accessToken, listId, maxItems } = microsoftImportSchema.parse(req.body);
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const lists = await fetchTodoLists(accessToken);
  const selectedList = lists.find((list) => list.id === listId);
  const listTitle = selectedList?.displayName || "Microsoft To Do";

  const graphTasks = await fetchListTasks(accessToken, listId, maxItems ?? 50);

  let imported = 0;
  for (const graphTask of graphTasks) {
    const payload = {
      userId,
      title: graphTask.title || "Untitled",
      description: graphTask.body?.content || "",
      status: mapGraphStatus(graphTask.status),
      priority: mapGraphPriority(graphTask.importance),
      dueDate: normalizeDate(graphTask.dueDateTime?.dateTime ?? null),
      linkedResource: pickLinkedResource(graphTask),
      source: {
        provider: "microsoft_todo" as const,
        listId,
        listTitle,
        taskId: graphTask.id
      }
    };

    await Task.findOneAndUpdate(
      { userId, "source.provider": "microsoft_todo", "source.taskId": graphTask.id },
      payload,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    imported += 1;
  }

  return res.status(200).json({ imported, listId, listTitle });
});
