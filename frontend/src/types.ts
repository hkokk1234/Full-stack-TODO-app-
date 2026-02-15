export type User = {
  id: string;
  name: string;
  email: string;
};

export type AuthResponse = {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  sessionId?: string;
  user: User;
};

export type TaskStatus = "todo" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";

export type LinkedResource = {
  title: string;
  url: string;
};

export type Subtask = {
  id: string;
  title: string;
  done: boolean;
};

export type TaskRecurrence = {
  frequency: "none" | "daily" | "weekly" | "monthly";
  interval: number;
};

export type TaskAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  provider: "local" | "s3" | "cloudinary";
  storageKey: string;
  createdAt: string;
};

export type TaskShare = {
  userId: string;
  permission: "viewer" | "editor";
  name?: string;
  email?: string;
};

export type TaskSource = {
  provider: "microsoft_todo";
  listId: string;
  taskId: string;
  listTitle?: string;
};

export type Task = {
  _id: string;
  userId: string;
  workspaceId: string | null;
  projectId: string | null;
  assigneeIds: string[];
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  subtasks: Subtask[];
  attachments: TaskAttachment[];
  sharedWith: TaskShare[];
  recurrence: TaskRecurrence;
  progressPercent?: number;
  linkedResource: LinkedResource | null;
  source: TaskSource | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskComment = {
  _id: string;
  taskId: string;
  authorId: { _id: string; name?: string; email?: string } | string;
  body: string;
  createdAt: string;
};

export type TaskActivity = {
  _id: string;
  taskId: string;
  action: string;
  details: Record<string, unknown>;
  actorId: { _id: string; name?: string; email?: string } | string;
  createdAt: string;
};

export type TaskPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type TaskListResponse = {
  items: Task[];
  pagination: TaskPagination;
};

export type Session = {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
};

export type AssistantMessage = {
  _id: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type Notification = {
  _id: string;
  userId: string;
  taskId: string | null;
  type: "due_soon";
  title: string;
  message: string;
  dueAt: string | null;
  readAt: string | null;
  emailedAt: string | null;
  emailAttemptCount?: number;
  nextEmailAttemptAt?: string | null;
  lastEmailError?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationPreferences = {
  inAppDueSoon: boolean;
  emailDueSoon: boolean;
  unsubscribedAll: boolean;
};

export type AnalyticsSummary = {
  totals: {
    total: number;
    done: number;
    overdue: number;
    active: number;
  };
  completionRate: number;
  overdueTrend: Array<{ date: string; count: number }>;
  productivityWeekly: Array<{ weekStart: string; created: number; completed: number }>;
  productivityMonthly: Array<{ month: string; created: number; completed: number }>;
};

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type Workspace = {
  _id: string;
  name: string;
  ownerId: string;
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMember = {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
};

export type WorkspaceInvite = {
  id: string;
  workspaceId: string;
  email: string;
  role: Exclude<WorkspaceRole, "owner">;
  token: string;
  expiresAt: string;
};
