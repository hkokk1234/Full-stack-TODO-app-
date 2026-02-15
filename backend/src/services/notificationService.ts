import nodemailer from "nodemailer";
import config from "../config/env";
import Notification from "../models/Notification";
import Task from "../models/Task";
import User from "../models/User";
import { emitNotificationRealtime } from "../realtime/events";

let transporter: nodemailer.Transporter | null = null;

const hasSmtpConfig = Boolean(config.smtpHost && config.smtpUser && config.smtpPass);

const getTransporter = (): nodemailer.Transporter | null => {
  if (!hasSmtpConfig) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });
  return transporter;
};

export const createDueReminderNotifications = async (): Promise<number> => {
  if (!config.notificationsEnabled) return 0;

  const now = new Date();
  const windowEnd = new Date(now.getTime() + config.reminderWindowMinutes * 60 * 1000);
  const olderThan = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const tasks = await Task.find({
    status: { $ne: "done" },
    dueDate: { $ne: null, $gte: olderThan, $lte: windowEnd }
  })
    .select("_id userId title dueDate")
    .lean();

  const users = await User.find({ _id: { $in: tasks.map((task) => task.userId) } })
    .select("_id notificationPreferences")
    .lean();
  const userPrefs = new Map(users.map((user) => [String(user._id), user.notificationPreferences]));

  let createdCount = 0;
  for (const task of tasks) {
    const dueAt = task.dueDate ?? null;
    if (!dueAt) continue;
    const prefs = userPrefs.get(String(task.userId));
    if (!prefs) continue;
    const shouldCreate = !prefs.unsubscribedAll && (prefs.inAppDueSoon || prefs.emailDueSoon);
    if (!shouldCreate) continue;

    try {
      await Notification.create({
        userId: task.userId,
        taskId: task._id,
        type: "due_soon",
        title: "Task due soon",
        message: `"${task.title}" is due at ${dueAt.toLocaleString()}`,
        dueAt,
        readAt: null,
        emailedAt: null,
        emailAttemptCount: 0,
        nextEmailAttemptAt: null,
        lastEmailError: null
      });
      emitNotificationRealtime({
        type: "notification.created",
        userId: String(task.userId),
        payload: { taskId: String(task._id) }
      });
      createdCount += 1;
    } catch {
      // Duplicate reminder prevented by unique index.
    }
  }

  return createdCount;
};

export const sendPendingReminderEmails = async (): Promise<number> => {
  const mailer = getTransporter();
  if (!mailer) return 0;

  const now = new Date();
  const items = await Notification.find({
    type: "due_soon",
    emailedAt: null,
    emailAttemptCount: { $lt: config.emailRetryMaxAttempts },
    $or: [{ nextEmailAttemptAt: null }, { nextEmailAttemptAt: { $lte: now } }]
  })
    .sort({ createdAt: 1 })
    .limit(100)
    .lean();

  if (!items.length) return 0;

  const userIds = Array.from(new Set(items.map((item) => String(item.userId))));
  const users = await User.find({ _id: { $in: userIds } })
    .select("_id email name notificationPreferences")
    .lean();
  const byUserId = new Map(users.map((user) => [String(user._id), user]));

  let sent = 0;
  for (const item of items) {
    const user = byUserId.get(String(item.userId));
    if (!user?.email) continue;
    const prefs = user.notificationPreferences;
    if (!prefs || prefs.unsubscribedAll || !prefs.emailDueSoon) continue;

    try {
      await mailer.sendMail({
        from: config.smtpFrom,
        to: user.email,
        subject: item.title,
        text: `${item.message}\n\nTaskFlow reminder`
      });

      await Notification.updateOne(
        { _id: item._id },
        {
          $set: {
            emailedAt: new Date(),
            nextEmailAttemptAt: null,
            lastEmailError: null
          }
        }
      );
      sent += 1;
    } catch (error) {
      const nextAttemptCount = (item.emailAttemptCount ?? 0) + 1;
      const backoffMinutes = config.emailRetryBaseMinutes * Math.pow(2, Math.max(0, nextAttemptCount - 1));
      const nextAttemptAt = new Date(Date.now() + backoffMinutes * 60 * 1000);
      const lastError = error instanceof Error ? error.message.slice(0, 500) : "Email send failed";

      await Notification.updateOne(
        { _id: item._id },
        {
          $set: {
            emailAttemptCount: nextAttemptCount,
            nextEmailAttemptAt: nextAttemptAt,
            lastEmailError: lastError
          }
        }
      );
    }
  }

  return sent;
};
