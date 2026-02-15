import request from "supertest";
import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import Notification from "../../models/Notification";
import { loadApp, registerUser } from "../helpers";

describe("attachments, notifications and analytics", () => {
  it("uploads attachments for editable tasks", async () => {
    const app = await loadApp();
    const user = await registerUser(app, "Attachment");

    const task = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ title: "Task with attachment" });
    expect(task.status).toBe(201);

    const upload = await request(app)
      .post(`/tasks/${task.body._id as string}/attachments`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", Buffer.from("hello world", "utf8"), "note.txt");

    expect(upload.status).toBe(201);
    expect(upload.body.provider).toBe("local");
    expect(typeof upload.body.url).toBe("string");
  });

  it("reads and updates notification preferences", async () => {
    const app = await loadApp();
    const user = await registerUser(app, "Notify");
    await Notification.create({
      userId: new mongoose.Types.ObjectId(user.userId),
      taskId: null,
      type: "due_soon",
      title: "Reminder",
      message: "Task due soon",
      dueAt: new Date(),
      readAt: null,
      emailedAt: null,
      emailAttemptCount: 0,
      nextEmailAttemptAt: null,
      lastEmailError: null
    });

    const list = await request(app).get("/notifications").set("Authorization", `Bearer ${user.token}`);
    expect(list.status).toBe(200);
    expect(list.body.unreadCount).toBe(1);

    const preferences = await request(app)
      .put("/notifications/preferences")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ emailDueSoon: false });
    expect(preferences.status).toBe(200);
    expect(preferences.body.notificationPreferences.emailDueSoon).toBe(false);
  });

  it("returns analytics summary for totals and trends", async () => {
    const app = await loadApp();
    const user = await registerUser(app, "Analytics");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ title: "Done task", status: "done" });

    await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ title: "Overdue task", status: "todo", dueDate: yesterday.toISOString() });

    await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${user.token}`)
      .send({ title: "Upcoming task", status: "in_progress", dueDate: tomorrow.toISOString() });

    const analytics = await request(app).get("/analytics/summary").set("Authorization", `Bearer ${user.token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.totals.total).toBe(3);
    expect(analytics.body.totals.done).toBe(1);
    expect(analytics.body.totals.overdue).toBe(1);
    expect(analytics.body.completionRate).toBe(33);
    expect(analytics.body.overdueTrend).toHaveLength(14);
    expect(analytics.body.productivityWeekly).toHaveLength(8);
  });
});
