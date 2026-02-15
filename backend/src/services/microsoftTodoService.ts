import type { TaskPriority, TaskStatus } from "../models/Task";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

type GraphList = { id: string; displayName: string };

type GraphTask = {
  id: string;
  title: string;
  status: string;
  importance: "low" | "normal" | "high";
  body?: { contentType?: string; content?: string };
  dueDateTime?: { dateTime?: string | null } | null;
  webUrl?: string;
  linkedResources?: Array<{ displayName?: string; webUrl?: string; applicationName?: string }>;
};

const graphRequest = async <T>(path: string, accessToken: string): Promise<T> => {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Microsoft Graph error (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
};

export const fetchTodoLists = async (accessToken: string): Promise<GraphList[]> => {
  const data = await graphRequest<{ value: GraphList[] }>("/me/todo/lists?$top=50", accessToken);
  return data.value ?? [];
};

export const fetchListTasks = async (accessToken: string, listId: string, maxItems = 50): Promise<GraphTask[]> => {
  const safeMax = Math.min(Math.max(maxItems, 1), 100);
  const data = await graphRequest<{ value: GraphTask[] }>(
    `/me/todo/lists/${encodeURIComponent(listId)}/tasks?$top=${safeMax}`,
    accessToken
  );
  return data.value ?? [];
};

export const mapGraphStatus = (status: string): TaskStatus => {
  if (status === "completed") return "done";
  if (status === "inProgress") return "in_progress";
  return "todo";
};

export const mapGraphPriority = (importance: GraphTask["importance"]): TaskPriority => {
  if (importance === "high") return "high";
  if (importance === "low") return "low";
  return "medium";
};

export const normalizeDate = (raw?: string | null): Date | null => {
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const pickLinkedResource = (task: GraphTask): { title: string; url: string } | null => {
  const firstLinked = task.linkedResources?.find((item) => item.webUrl);
  if (firstLinked?.webUrl) {
    return {
      title: firstLinked.displayName || firstLinked.applicationName || "Open linked resource",
      url: firstLinked.webUrl
    };
  }

  if (task.webUrl) {
    return { title: "Open in Microsoft To Do", url: task.webUrl };
  }

  return null;
};
