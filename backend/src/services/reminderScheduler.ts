import cron from "node-cron";
import config from "../config/env";
import { createDueReminderNotifications, sendPendingReminderEmails } from "./notificationService";

let started = false;

export const startReminderScheduler = (): void => {
  if (started || !config.notificationsEnabled) return;
  started = true;

  const run = async (): Promise<void> => {
    try {
      const created = await createDueReminderNotifications();
      const emailed = await sendPendingReminderEmails();
      if (created > 0 || emailed > 0) {
        console.log(`[reminders] created=${created} emailed=${emailed}`);
      }
    } catch (error) {
      console.error("[reminders] failed", error);
    }
  };

  cron.schedule(config.reminderCron, () => {
    void run();
  });

  void run();
};
