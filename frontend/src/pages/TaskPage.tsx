import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { api } from "../api/client";
import type {
  AuthResponse,
  Notification,
  Subtask,
  Task,
  TaskShare,
  TaskActivity,
  TaskComment,
  TaskPagination,
  TaskPriority,
  TaskRecurrence,
  TaskStatus
} from "../types";

type TaskPageProps = {
  auth: AuthResponse;
  clearAuth: () => void;
};

const statusOptions: TaskStatus[] = ["todo", "in_progress", "done"];
const kanbanColumns: Array<{ key: TaskStatus; label: string }> = [
  { key: "todo", label: "Todo" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" }
];
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const WORKSPACE_KEY = "todo_selected_workspace";

const getDueBadge = (task: Task): "OVERDUE" | "TODAY" | null => {
  if (!task.dueDate || task.status === "done") return null;
  const due = new Date(task.dueDate);
  const now = new Date();

  const dueDateOnly = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  if (dueDateOnly < todayOnly) return "OVERDUE";
  if (dueDateOnly === todayOnly) return "TODAY";
  return null;
};

const nameFromActor = (actor: TaskActivity["actorId"] | TaskComment["authorId"]): string => {
  if (typeof actor === "string") return actor;
  return actor.name || actor.email || String(actor._id);
};

const TaskPage = ({ auth, clearAuth }: TaskPageProps): JSX.Element => {
  const socketRef = useRef<Socket | null>(null);

  const [items, setItems] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<TaskPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
    hasNext: false,
    hasPrev: false
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | TaskStatus>("all");
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate" | "priority" | "title" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [importFormat, setImportFormat] = useState<"csv" | "json">("csv");
  const [importFile, setImportFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [recurrence, setRecurrence] = useState<TaskRecurrence>({ frequency: "none", interval: 1 });
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [sharePermission, setSharePermission] = useState<"viewer" | "editor">("viewer");
  const [shareMembers, setShareMembers] = useState<TaskShare[]>([]);
  const [resourceTitle, setResourceTitle] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");

  const [comments, setComments] = useState<TaskComment[]>([]);
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    () => localStorage.getItem(`${WORKSPACE_KEY}_${auth.user.id}`) ?? ""
  );

  const loadTasks = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const data = await api.listTasks(auth.token, {
        workspaceId: selectedWorkspaceId || undefined,
        assignedTo: myTasksOnly ? "me" : undefined,
        search,
        status: filterStatus === "all" ? undefined : filterStatus,
        sortBy,
        sortOrder,
        page: pagination.page,
        pageSize: pagination.pageSize
      });

      setItems(data.items ?? []);
      setPagination(data.pagination);

      if (data.items.length > 0) {
        setSelectedTaskId((prev) => {
          if (!prev) return data.items[0]._id;
          return data.items.some((item) => item._id === prev) ? prev : data.items[0]._id;
        });
      } else {
        setSelectedTaskId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [auth.token, selectedWorkspaceId, myTasksOnly, search, filterStatus, sortBy, sortOrder, pagination.page, pagination.pageSize]);

  const loadTaskContext = useCallback(async (taskId: string): Promise<void> => {
    try {
      const [commentsRes, activityRes, sharesRes] = await Promise.all([
        api.listComments(auth.token, taskId),
        api.listActivity(auth.token, taskId),
        api.listTaskShares(auth.token, taskId)
      ]);
      setComments(commentsRes.items);
      setActivity(activityRes.items);
      setShareMembers(sharesRes.items);
    } catch {
      setComments([]);
      setActivity([]);
      setShareMembers([]);
    }
  }, [auth.token]);

  const loadNotifications = useCallback(async (): Promise<void> => {
    try {
      const data = await api.listNotifications(auth.token);
      setNotifications(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [auth.token]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  useEffect(() => {
    setSelectedWorkspaceId(localStorage.getItem(`${WORKSPACE_KEY}_${auth.user.id}`) ?? "");
  }, [auth.user.id]);

  useEffect(() => {
    const socket = io(API_URL, {
      transports: ["websocket"],
      auth: { token: auth.token }
    });

    socketRef.current = socket;

    socket.on("workspace:event", () => {
      void loadTasks();
    });

    socket.on("task:event", (event: { taskId?: string; type?: string }) => {
      if (!event?.taskId) return;
      if (selectedTaskId && event.taskId === selectedTaskId) {
        void loadTaskContext(selectedTaskId);
      }
      void loadTasks();
    });

    socket.on("notification:event", () => {
      void loadNotifications();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [auth.token, loadNotifications, loadTaskContext, loadTasks, selectedTaskId]);

  useEffect(() => {
    if (!selectedTaskId || !socketRef.current) return;
    socketRef.current.emit("task:subscribe", selectedTaskId);

    return () => {
      socketRef.current?.emit("task:unsubscribe", selectedTaskId);
    };
  }, [selectedTaskId]);

  const selectedTask = useMemo(() => items.find((task) => task._id === selectedTaskId) ?? null, [items, selectedTaskId]);

  useEffect(() => {
    if (!selectedTask) {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority("medium");
      setDueDate("");
      setSubtasks([]);
      setNewSubtaskTitle("");
      setRecurrence({ frequency: "none", interval: 1 });
      setResourceTitle("");
      setResourceUrl("");
      setShareMembers([]);
      setShareEmail("");
      setSharePermission("viewer");
      setComments([]);
      setActivity([]);
      return;
    }

    setTitle(selectedTask.title);
    setDescription(selectedTask.description ?? "");
    setStatus(selectedTask.status);
    setPriority(selectedTask.priority);
    setDueDate(selectedTask.dueDate ? selectedTask.dueDate.slice(0, 10) : "");
    setSubtasks(selectedTask.subtasks ?? []);
    setRecurrence(selectedTask.recurrence ?? { frequency: "none", interval: 1 });
    setResourceTitle(selectedTask.linkedResource?.title ?? "");
    setResourceUrl(selectedTask.linkedResource?.url ?? "");

    void loadTaskContext(selectedTask._id);
  }, [selectedTask, loadTaskContext]);

  const onApplySearch = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSearch(searchInput.trim());
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!newTitle.trim()) return;

    try {
      await api.createTask(auth.token, {
        title: newTitle.trim(),
        status: "todo",
        priority: "medium",
        workspaceId: selectedWorkspaceId || undefined
      });
      setNewTitle("");
      setNotice("Task added.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onSaveDetails = async (): Promise<void> => {
    if (!selectedTask) return;

    try {
      setSaving(true);
      await api.updateTask(auth.token, selectedTask._id, {
        title,
        description,
        status,
        priority,
        dueDate: dueDate || null,
        subtasks,
        recurrence,
        linkedResource: resourceTitle || resourceUrl ? { title: resourceTitle, url: resourceUrl } : undefined
      });
      setNotice("Task updated.");
      await loadTasks();
      await loadTaskContext(selectedTask._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const onToggleAssignment = async (): Promise<void> => {
    if (!selectedTask) return;

    try {
      const assignedToMe = selectedTask.assigneeIds.includes(auth.user.id);
      if (assignedToMe) {
        await api.unassignMe(auth.token, selectedTask._id);
        setNotice("Unassigned from task.");
      } else {
        await api.assignMe(auth.token, selectedTask._id);
        setNotice("Assigned to task.");
      }

      await loadTasks();
      await loadTaskContext(selectedTask._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onAddComment = async (): Promise<void> => {
    if (!selectedTask || !commentInput.trim()) return;

    try {
      await api.createComment(auth.token, selectedTask._id, commentInput.trim());
      setCommentInput("");
      await loadTaskContext(selectedTask._id);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to comment");
    }
  };

  const onQuickStatusToggle = async (task: Task): Promise<void> => {
    const nextStatus: TaskStatus = task.status === "todo" ? "in_progress" : task.status === "in_progress" ? "done" : "todo";

    try {
      await api.updateTask(auth.token, task._id, { status: nextStatus });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onDelete = async (id: string): Promise<void> => {
    try {
      await api.deleteTask(auth.token, id);
      setNotice("Task deleted.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onAddSubtask = (): void => {
    const trimmed = newSubtaskTitle.trim();
    if (!trimmed) return;

    const item: Subtask = {
      id: crypto.randomUUID(),
      title: trimmed,
      done: false
    };
    setSubtasks((prev) => [...prev, item]);
    setNewSubtaskTitle("");
  };

  const onToggleSubtask = (id: string): void => {
    setSubtasks((prev) => prev.map((subtask) => (subtask.id === id ? { ...subtask, done: !subtask.done } : subtask)));
  };

  const onRemoveSubtask = (id: string): void => {
    setSubtasks((prev) => prev.filter((subtask) => subtask.id !== id));
  };

  const onDropToStatus = async (taskId: string, nextStatus: TaskStatus): Promise<void> => {
    try {
      await api.updateTask(auth.token, taskId, { status: nextStatus });
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onUploadAttachment = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!selectedTask) return;

    const form = event.currentTarget;
    const input = form.elements.namedItem("attachment") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    try {
      setUploadingAttachment(true);
      await api.uploadTaskAttachment(auth.token, selectedTask._id, file);
      form.reset();
      setNotice("Attachment uploaded.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const onDeleteAttachment = async (attachmentId: string): Promise<void> => {
    if (!selectedTask) return;
    try {
      await api.deleteTaskAttachment(auth.token, selectedTask._id, attachmentId);
      setNotice("Attachment removed.");
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onShareTask = async (): Promise<void> => {
    if (!selectedTask || !shareEmail.trim()) return;
    try {
      setSharingBusy(true);
      await api.shareTaskWithEmail(auth.token, selectedTask._id, {
        email: shareEmail.trim(),
        permission: sharePermission
      });
      setShareEmail("");
      setNotice("User access updated.");
      await loadTaskContext(selectedTask._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setSharingBusy(false);
    }
  };

  const onRemoveShare = async (memberUserId: string): Promise<void> => {
    if (!selectedTask) return;
    try {
      setSharingBusy(true);
      await api.removeTaskShare(auth.token, selectedTask._id, memberUserId);
      setNotice("Access removed.");
      await loadTaskContext(selectedTask._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSharingBusy(false);
    }
  };

  const grouped = useMemo(() => {
    return {
      todo: items.filter((task) => task.status === "todo"),
      in_progress: items.filter((task) => task.status === "in_progress"),
      done: items.filter((task) => task.status === "done")
    };
  }, [items]);

  const onMarkNotificationRead = async (id: string): Promise<void> => {
    try {
      await api.markNotificationRead(auth.token, id);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const onMarkAllRead = async (): Promise<void> => {
    try {
      await api.markAllNotificationsRead(auth.token);
      await loadNotifications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  };

  const goPrev = (): void => {
    if (!pagination.hasPrev) return;
    setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
  };

  const goNext = (): void => {
    if (!pagination.hasNext) return;
    setPagination((prev) => ({ ...prev, page: prev.page + 1 }));
  };

  const onExportTasks = async (format: "csv" | "json"): Promise<void> => {
    try {
      setTransferBusy(true);
      const blob = await api.exportTasks(auth.token, format);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tasks-export.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setNotice(`Exported ${format.toUpperCase()}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setTransferBusy(false);
    }
  };

  const onImportTasks = async (): Promise<void> => {
    if (!importFile) return;
    try {
      setTransferBusy(true);
      const result = await api.importTasksFile(auth.token, importFormat, importFile);
      setNotice(`Import done. Created: ${result.created}, Skipped: ${result.skipped}`);
      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).map((item) => `row ${item.row}: ${item.reason}`).join(" | "));
      }
      setImportFile(null);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setTransferBusy(false);
    }
  };

  return (
    <section className="todo-shell">
      <aside className="todo-sidebar">
        <h2>Filters</h2>
        <section className="workspace-box">
          <h3>Workspace scope</h3>
          <p className="subtle workspace-meta">
            {selectedWorkspaceId ? `Scoped to workspace: ${selectedWorkspaceId}` : "Showing tasks from all workspaces"}
          </p>
          <div className="workspace-create">
            <Link className="oauth-link" to="/workspaces">Manage workspaces</Link>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(`${WORKSPACE_KEY}_${auth.user.id}`);
                setSelectedWorkspaceId("");
                void loadTasks();
              }}
              disabled={!selectedWorkspaceId}
            >
              Clear scope
            </button>
          </div>
        </section>

        <button className={filterStatus === "all" ? "list-item active" : "list-item"} onClick={() => { setFilterStatus("all"); setPagination((prev) => ({ ...prev, page: 1 })); }}>All</button>
        <button className={filterStatus === "todo" ? "list-item active" : "list-item"} onClick={() => { setFilterStatus("todo"); setPagination((prev) => ({ ...prev, page: 1 })); }}>Todo</button>
        <button className={filterStatus === "in_progress" ? "list-item active" : "list-item"} onClick={() => { setFilterStatus("in_progress"); setPagination((prev) => ({ ...prev, page: 1 })); }}>In progress</button>
        <button className={filterStatus === "done" ? "list-item active" : "list-item"} onClick={() => { setFilterStatus("done"); setPagination((prev) => ({ ...prev, page: 1 })); }}>Done</button>

        <button className={myTasksOnly ? "list-item active" : "list-item"} onClick={() => { setMyTasksOnly((prev) => !prev); setPagination((prev) => ({ ...prev, page: 1 })); }}>
          My tasks only
        </button>

        <label className="field-label">
          Sort by
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as typeof sortBy); setPagination((prev) => ({ ...prev, page: 1 })); }}>
            <option value="createdAt">created date</option>
            <option value="dueDate">due date</option>
            <option value="priority">priority</option>
            <option value="title">title</option>
            <option value="status">status</option>
          </select>
        </label>

        <label className="field-label">
          Order
          <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value as "asc" | "desc"); setPagination((prev) => ({ ...prev, page: 1 })); }}>
            <option value="desc">desc</option>
            <option value="asc">asc</option>
          </select>
        </label>
        <section className="transfer-box">
          <h3>Import / Export</h3>
          <div className="transfer-actions">
            <button type="button" onClick={() => void onExportTasks("csv")} disabled={transferBusy}>Export CSV</button>
            <button type="button" onClick={() => void onExportTasks("json")} disabled={transferBusy}>Export JSON</button>
          </div>
          <div className="transfer-actions">
            <select value={importFormat} onChange={(event) => setImportFormat(event.target.value as "csv" | "json")}>
              <option value="csv">CSV import</option>
              <option value="json">JSON import</option>
            </select>
            <input
              type="file"
              accept={importFormat === "csv" ? ".csv,text/csv" : ".json,application/json"}
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <button type="button" onClick={() => void onImportTasks()} disabled={transferBusy || !importFile}>Import</button>
          </div>
        </section>
        <section className="notify-box">
          <div className="notify-head">
            <h3>Notifications ({unreadCount})</h3>
            <button type="button" onClick={() => void onMarkAllRead()}>Read all</button>
          </div>
          <ul className="notify-list">
            {notifications.slice(0, 8).map((notification) => (
              <li key={notification._id} className={notification.readAt ? "is-read" : "is-unread"}>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                {!notification.readAt ? (
                  <button type="button" onClick={() => void onMarkNotificationRead(notification._id)}>Mark read</button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        <Link className="oauth-link" to="/notifications">Notification Center</Link>
        <Link className="oauth-link" to="/workspaces">Workspaces</Link>
        <Link className="oauth-link" to="/assistant">AI Assistant</Link>
        <Link className="oauth-link" to="/analytics">Analytics</Link>
        <Link className="oauth-link" to="/security">Account / Security</Link>
        <button className="logout-link" onClick={clearAuth}>Logout</button>
      </aside>

      <section className="todo-main">
        <header className="todo-header">
          <h1>{auth.user.name}&apos;s Workspace</h1>
          {loading && <p>Loading tasks...</p>}
        </header>

        <form className="search-row" onSubmit={onApplySearch}>
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search title or note" />
          <button type="submit">Search</button>
        </form>

        {error && <p className="error">{error}</p>}
        {notice && <p className="notice">{notice}</p>}

        <section className="kanban-board">
          {kanbanColumns.map((column) => (
            <div
              key={column.key}
              className="kanban-column"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData("text/task-id");
                if (taskId) void onDropToStatus(taskId, column.key);
              }}
            >
              <h3>{column.label}</h3>
              <ul className="todo-list">
                {grouped[column.key].map((task) => {
                  const dueBadge = getDueBadge(task);
                  return (
                    <li
                      key={task._id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData("text/task-id", task._id)}
                      className={task._id === selectedTaskId ? "todo-row selected" : "todo-row"}
                    >
                      <button className={task.status === "done" ? "status-dot done" : "status-dot"} onClick={() => void onQuickStatusToggle(task)} aria-label="Toggle task status">
                        {task.status === "done" ? "OK" : ""}
                      </button>
                      <button className="row-content" onClick={() => setSelectedTaskId(task._id)}>
                        <strong>{task.title}</strong>
                        <span>
                          {task.priority}
                          {task.assigneeIds.includes(auth.user.id) ? " | ASSIGNED" : ""}
                          {dueBadge ? ` | ${dueBadge}` : ""}
                        </span>
                        <div className="progress-wrap">
                          <div className="progress-fill" style={{ width: `${task.progressPercent ?? 0}%` }} />
                        </div>
                      </button>
                      <button className="delete-link" onClick={() => void onDelete(task._id)}>x</button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </section>

        <div className="pager-row">
          <button onClick={goPrev} disabled={!pagination.hasPrev}>Prev</button>
          <p>Page {pagination.page} / {pagination.totalPages} ({pagination.total} total)</p>
          <button onClick={goNext} disabled={!pagination.hasNext}>Next</button>
        </div>

        <form className="add-task-bar" onSubmit={onCreate}>
          <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add a new task" required />
          <button type="submit">Add</button>
        </form>
      </section>

      <aside className="todo-detail">
        <h2>Task details</h2>
        {selectedTask ? (
          <div className="detail-form">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add note" rows={4} />

            <button onClick={() => void onToggleAssignment()}>
              {selectedTask.assigneeIds.includes(auth.user.id) ? "Unassign me" : "Assign to me"}
            </button>

            <label>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {statusOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>

            <label>
              Due date
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </label>

            <label>
              Recurrence
              <select
                value={recurrence.frequency}
                onChange={(event) =>
                  setRecurrence((prev) => ({
                    ...prev,
                    frequency: event.target.value as TaskRecurrence["frequency"]
                  }))
                }
              >
                <option value="none">none</option>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
                <option value="monthly">monthly</option>
              </select>
            </label>

            {recurrence.frequency !== "none" ? (
              <label>
                Every N intervals
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={recurrence.interval}
                  onChange={(event) =>
                    setRecurrence((prev) => ({
                      ...prev,
                      interval: Math.max(1, Math.min(365, Number(event.target.value || 1)))
                    }))
                  }
                />
              </label>
            ) : null}

            <section className="subtask-box">
              <h3>Checklist</h3>
              <div className="subtask-form">
                <input value={newSubtaskTitle} onChange={(event) => setNewSubtaskTitle(event.target.value)} placeholder="Add subtask" />
                <button type="button" onClick={onAddSubtask}>Add</button>
              </div>
              <ul className="stack-list">
                {subtasks.map((subtask) => (
                  <li key={subtask.id} className="subtask-row">
                    <label>
                      <input type="checkbox" checked={subtask.done} onChange={() => onToggleSubtask(subtask.id)} />
                      <span>{subtask.title}</span>
                    </label>
                    <button type="button" className="delete-link" onClick={() => onRemoveSubtask(subtask.id)}>x</button>
                  </li>
                ))}
              </ul>
            </section>

            <div className="linked-box">
              <h3>Linked resource</h3>
              <input value={resourceTitle} onChange={(e) => setResourceTitle(e.target.value)} placeholder="Resource title" />
              <input value={resourceUrl} onChange={(e) => setResourceUrl(e.target.value)} placeholder="https://..." />
            </div>

            <section className="attachments-box">
              <h3>Attachments</h3>
              <form className="attachment-form" onSubmit={(event) => void onUploadAttachment(event)}>
                <input name="attachment" type="file" />
                <button type="submit" disabled={uploadingAttachment}>{uploadingAttachment ? "Uploading..." : "Upload"}</button>
              </form>
              <ul className="attachment-list">
                {(selectedTask.attachments ?? []).map((attachment) => (
                  <li key={attachment.id}>
                    {attachment.mimeType.startsWith("image/") ? (
                      <a href={attachment.url} target="_blank" rel="noreferrer">
                        <img src={attachment.url} alt={attachment.name} />
                      </a>
                    ) : (
                      <a href={attachment.url} target="_blank" rel="noreferrer">{attachment.name}</a>
                    )}
                    <button type="button" onClick={() => void onDeleteAttachment(attachment.id)}>Delete</button>
                  </li>
                ))}
              </ul>
            </section>

            <section className="share-box">
              <h3>Access Control</h3>
              {selectedTask.projectId ? (
                <p className="subtle">For project tasks, manage access via project members/roles.</p>
              ) : (
                <>
                  <div className="share-form">
                    <input
                      type="email"
                      value={shareEmail}
                      onChange={(event) => setShareEmail(event.target.value)}
                      placeholder="user@email.com"
                    />
                    <select value={sharePermission} onChange={(event) => setSharePermission(event.target.value as "viewer" | "editor")}>
                      <option value="viewer">viewer</option>
                      <option value="editor">editor</option>
                    </select>
                    <button type="button" onClick={() => void onShareTask()} disabled={sharingBusy}>Share</button>
                  </div>
                  <ul className="share-list">
                    {shareMembers.map((member) => (
                      <li key={member.userId}>
                        <div>
                          <strong>{member.name || member.email || member.userId}</strong>
                          <p>{member.email || ""} | {member.permission}</p>
                        </div>
                        <button type="button" onClick={() => void onRemoveShare(member.userId)} disabled={sharingBusy}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <button onClick={() => void onSaveDetails()} disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>

            <section className="collab-box">
              <h3>Comments</h3>
              <div className="comment-form">
                <input value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Write a comment" />
                <button onClick={() => void onAddComment()}>Post</button>
              </div>
              <ul className="stack-list">
                {comments.map((comment) => (
                  <li key={comment._id}>
                    <strong>{nameFromActor(comment.authorId)}</strong>
                    <p>{comment.body}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="collab-box">
              <h3>Activity</h3>
              <ul className="stack-list">
                {activity.map((entry) => (
                  <li key={entry._id}>
                    <strong>{entry.action}</strong>
                    <p>{nameFromActor(entry.actorId)}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : (
          <p>Select a task from the list.</p>
        )}
      </aside>
    </section>
  );
};

export default TaskPage;
