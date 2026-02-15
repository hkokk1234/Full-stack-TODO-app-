import type { Request, Response } from "express";
import AssistantMessage from "../models/AssistantMessage";
import Task from "../models/Task";
import { askOpenAI } from "../services/aiService";
import { asyncHandler } from "../utils/asyncHandler";
import { aiChatSchema } from "../validators.ai";

const systemPrompt = `
You are a task assistant inside a TODO app.
Rules:
- Keep answers short and actionable.
- If user asks to create a task, return:
  ACTION:CREATE_TASK
  TITLE:<short title>
  DESCRIPTION:<optional text>
  PRIORITY:<low|medium|high>
  DUE_DATE:<YYYY-MM-DD or empty>
- Otherwise provide direct guidance.
`;

const parsePriorityFromText = (value: string): "low" | "medium" | "high" => {
  const text = value.toLowerCase();
  if (text.includes("high") || text.includes("urgent") || text.includes("ψηλη") || text.includes("υψηλη")) return "high";
  if (text.includes("low") || text.includes("χαμη")) return "low";
  return "medium";
};

const parseDueDateFromText = (value: string): string | undefined => {
  const text = value.toLowerCase();
  const now = new Date();

  if (text.includes("tomorrow") || text.includes("αυριο")) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }

  if (text.includes("today") || text.includes("σημερα")) {
    return now.toISOString().slice(0, 10);
  }

  const ymd = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;

  const dmy = value.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  return undefined;
};

const localAssistantReply = (
  userInput: string,
  tasks: Array<{ title: string; status: string; priority: string; dueDate: Date | null }>
): string => {
  const text = userInput.trim();
  const lower = text.toLowerCase();
  const createIntent =
    lower.includes("create task") ||
    lower.includes("add task") ||
    lower.includes("new task") ||
    lower.includes("φτιαξε task") ||
    lower.includes("δημιουργ");

  if (createIntent) {
    const cleanedTitle = text
      .replace(/create task|add task|new task|φτιαξε task|δημιουργησε task|δημιουργία task/gi, "")
      .trim();
    const title = cleanedTitle || "New task";
    const dueDate = parseDueDateFromText(text) || "";
    const priority = parsePriorityFromText(text);

    return `ACTION:CREATE_TASK
TITLE:${title}
DESCRIPTION:
PRIORITY:${priority}
DUE_DATE:${dueDate}`;
  }

  if (lower.includes("summary") || lower.includes("summarize") || lower.includes("τι αλλαξε") || lower.includes("τι έγινε")) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    return `Quick summary: total ${total}, todo ${todo}, in_progress ${inProgress}, done ${done}.`;
  }

  return "Μπορω να βοηθησω με task creation. Γραψε: create task <title> [tomorrow|YYYY-MM-DD] [high|medium|low].";
};

const parseCreateAction = (reply: string): {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high";
  dueDate?: string;
} | null => {
  if (!reply.includes("ACTION:CREATE_TASK")) return null;

  const read = (key: string) => {
    const match = reply.match(new RegExp(`${key}:(.*)`, "i"));
    return match ? match[1].trim() : "";
  };

  const title = read("TITLE");
  if (!title) return null;

  const description = read("DESCRIPTION");
  const priorityRaw = read("PRIORITY").toLowerCase();
  const dueDate = read("DUE_DATE");

  const priority = priorityRaw === "low" || priorityRaw === "high" || priorityRaw === "medium" ? priorityRaw : undefined;

  return { title, description: description || undefined, priority, dueDate: dueDate || undefined };
};

export const listAssistantMessages = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const items = await AssistantMessage.find({ userId }).sort({ createdAt: 1 }).limit(100).lean();
  return res.status(200).json({ items });
});

export const chatWithAssistant = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { message } = aiChatSchema.parse(req.body);

  await AssistantMessage.create({ userId, role: "user", content: message.trim() });

  const recentMessages = await AssistantMessage.find({ userId }).sort({ createdAt: -1 }).limit(12).lean();
  const recentTasks = await Task.find({ userId }).sort({ createdAt: -1 }).limit(15).lean();

  const taskContext = recentTasks
    .map((task) => `${task.title} | status=${task.status} | priority=${task.priority} | due=${task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "-"}`)
    .join("\n");

  const messages = [
    { role: "system" as const, content: systemPrompt },
    { role: "system" as const, content: `Recent tasks:\n${taskContext || "No tasks yet."}` },
    ...recentMessages
      .reverse()
      .map((item) => ({ role: item.role, content: item.content })) as Array<{ role: "user" | "assistant"; content: string }>
  ];

  let rawReply = await askOpenAI(messages);
  if (
    rawReply.includes("OPENAI_API_KEY is missing") ||
    rawReply.includes("AI request failed (429)") ||
    rawReply.includes("AI request failed")
  ) {
    rawReply = localAssistantReply(message, recentTasks);
  }

  const action = parseCreateAction(rawReply);

  let reply = rawReply;

  if (action) {
    const created = await Task.create({
      userId,
      title: action.title,
      description: action.description || "",
      priority: action.priority || "medium",
      dueDate: action.dueDate || null,
      status: "todo"
    });

    reply = `Created task: "${created.title}" (${created.priority}${created.dueDate ? `, due ${created.dueDate.toISOString().slice(0, 10)}` : ""}).`;
  }

  const saved = await AssistantMessage.create({ userId, role: "assistant", content: reply });

  return res.status(200).json({ reply: saved.content, message: saved });
});
