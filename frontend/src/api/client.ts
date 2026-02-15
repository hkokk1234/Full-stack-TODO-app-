import type {
  AuthResponse,
  AssistantMessage,
  AnalyticsSummary,
  LinkedResource,
  Notification,
  NotificationPreferences,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  Session,
  Subtask,
  Task,
  TaskShare,
  TaskRecurrence,
  TaskActivity,
  TaskComment,
  TaskListResponse,
  TaskPriority,
  TaskStatus
} from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

type RequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

const request = async <T>(path: string, options: RequestOptions = {}, token?: string): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers ?? {})
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (response.status === 204) return null as T;

  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "Request failed");

  return data;
};

const uploadRequest = async <T>(path: string, formData: FormData, token: string): Promise<T> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  if (response.status === 204) return null as T;
  const data = (await response.json()) as T & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "Request failed");
  return data;
};

const downloadRequest = async (path: string, token: string): Promise<Blob> => {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    let message = "Request failed";
    try {
      const data = await response.json() as { message?: string };
      message = data.message ?? message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.blob();
};

type TaskPayload = {
  title: string;
  workspaceId?: string;
  projectId?: string;
  assigneeIds?: string[];
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
  subtasks?: Subtask[];
  recurrence?: TaskRecurrence;
  linkedResource?: LinkedResource;
};

type ListTaskQuery = {
  workspaceId?: string;
  projectId?: string;
  assignedTo?: "me";
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  sortBy?: "createdAt" | "dueDate" | "priority" | "title" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const buildQuery = (params: ListTaskQuery): string => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, String(value));
    }
  });

  const built = query.toString();
  return built ? `?${built}` : "";
};

export const api = {
  register: (payload: { name: string; email: string; password: string }) =>
    request<AuthResponse>("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { email: string; password: string }) =>
    request<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  passkeyLoginOptions: (payload: { email: string }) =>
    request<Record<string, unknown>>("/auth/passkeys/login/options", { method: "POST", body: JSON.stringify(payload) }),
  passkeyLoginVerify: (payload: { email: string; response: Record<string, unknown> }) =>
    request<AuthResponse>("/auth/passkeys/login/verify", { method: "POST", body: JSON.stringify(payload) }),
  passkeyRegisterOptions: (token: string) =>
    request<Record<string, unknown>>("/auth/passkeys/register/options", { method: "POST" }, token),
  passkeyRegisterVerify: (token: string, payload: { response: Record<string, unknown> }) =>
    request<{ verified: boolean; passkeysCount: number }>("/auth/passkeys/register/verify", { method: "POST", body: JSON.stringify(payload) }, token),
  listSessions: (token: string) => request<{ items: Session[] }>("/auth/sessions", { method: "GET" }, token),
  revokeSession: (token: string, sessionId: string) =>
    request<null>(`/auth/sessions/${sessionId}`, { method: "DELETE" }, token),
  logoutOtherDevices: (token: string, sessionId?: string) =>
    request<null>("/auth/logout-other-devices", { method: "POST", body: JSON.stringify({ sessionId }) }, token),
  listAssistantMessages: (token: string) => request<{ items: AssistantMessage[] }>("/ai/messages", { method: "GET" }, token),
  chatAssistant: (token: string, payload: { message: string }) =>
    request<{ reply: string; message: AssistantMessage }>("/ai/chat", { method: "POST", body: JSON.stringify(payload) }, token),
  listNotifications: (token: string, unreadOnly?: boolean) =>
    request<{ items: Notification[]; unreadCount: number }>(
      `/notifications${unreadOnly ? "?unreadOnly=true" : ""}`,
      { method: "GET" },
      token
    ),
  markNotificationRead: (token: string, id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: "POST" }, token),
  markAllNotificationsRead: (token: string) =>
    request<null>("/notifications/read-all", { method: "POST" }, token),
  getNotificationPreferences: (token: string) =>
    request<{ notificationPreferences: NotificationPreferences }>("/notifications/preferences", { method: "GET" }, token),
  updateNotificationPreferences: (token: string, payload: Partial<NotificationPreferences>) =>
    request<{ notificationPreferences: NotificationPreferences }>(
      "/notifications/preferences",
      { method: "PUT", body: JSON.stringify(payload) },
      token
    ),
  unsubscribeAllNotifications: (token: string) =>
    request<{ notificationPreferences: NotificationPreferences }>("/notifications/unsubscribe-all", { method: "POST" }, token),
  analyticsSummary: (token: string, workspaceId?: string) =>
    request<AnalyticsSummary>(`/analytics/summary${workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : ""}`, { method: "GET" }, token),
  exportTasks: (token: string, format: "csv" | "json") =>
    downloadRequest(`/tasks/export?format=${format}`, token),
  importTasksFile: (token: string, format: "csv" | "json", file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<{ message: string; created: number; skipped: number; errors: Array<{ row: number; reason: string }> }>(
      `/tasks/import?format=${format}`,
      formData,
      token
    );
  },

  listTasks: (token: string, query: ListTaskQuery = {}) =>
    request<TaskListResponse>(`/tasks${buildQuery(query)}`, { method: "GET" }, token),
  createTask: (token: string, payload: TaskPayload) => request<Task>("/tasks", { method: "POST", body: JSON.stringify(payload) }, token),
  updateTask: (token: string, id: string, payload: Partial<TaskPayload>) =>
    request<Task>(`/tasks/${id}`, { method: "PUT", body: JSON.stringify(payload) }, token),
  deleteTask: (token: string, id: string) => request<null>(`/tasks/${id}`, { method: "DELETE" }, token),

  assignMe: (token: string, id: string) => request<Task>(`/tasks/${id}/assign-me`, { method: "POST" }, token),
  unassignMe: (token: string, id: string) => request<Task>(`/tasks/${id}/assign-me`, { method: "DELETE" }, token),

  listComments: (token: string, id: string) => request<{ items: TaskComment[] }>(`/tasks/${id}/comments`, { method: "GET" }, token),
  createComment: (token: string, id: string, body: string) =>
    request<TaskComment>(`/tasks/${id}/comments`, { method: "POST", body: JSON.stringify({ body }) }, token),

  listActivity: (token: string, id: string) => request<{ items: TaskActivity[] }>(`/tasks/${id}/activity`, { method: "GET" }, token),
  uploadTaskAttachment: (token: string, taskId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return uploadRequest<Record<string, unknown>>(`/tasks/${taskId}/attachments`, formData, token);
  },
  deleteTaskAttachment: (token: string, taskId: string, attachmentId: string) =>
    request<null>(`/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" }, token),
  listTaskShares: (token: string, taskId: string) =>
    request<{ items: TaskShare[] }>(`/tasks/${taskId}/shares`, { method: "GET" }, token),
  shareTaskWithEmail: (token: string, taskId: string, payload: { email: string; permission: "viewer" | "editor" }) =>
    request<TaskShare>(`/tasks/${taskId}/shares`, { method: "POST", body: JSON.stringify(payload) }, token),
  removeTaskShare: (token: string, taskId: string, memberUserId: string) =>
    request<null>(`/tasks/${taskId}/shares/${memberUserId}`, { method: "DELETE" }, token),
  listWorkspaces: (token: string) =>
    request<{ items: Workspace[] }>("/workspaces", { method: "GET" }, token),
  createWorkspace: (token: string, payload: { name: string }) =>
    request<Workspace>("/workspaces", { method: "POST", body: JSON.stringify(payload) }, token),
  listWorkspaceMembers: (token: string, workspaceId: string) =>
    request<{ items: WorkspaceMember[] }>(`/workspaces/${workspaceId}/members`, { method: "GET" }, token),
  createWorkspaceInvite: (
    token: string,
    workspaceId: string,
    payload: { email: string; role: "admin" | "member" | "viewer"; expiresInDays?: number }
  ) =>
    request<WorkspaceInvite>(`/workspaces/${workspaceId}/invites`, { method: "POST", body: JSON.stringify(payload) }, token)
};
