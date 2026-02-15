import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApp, registerUser } from "../helpers";

describe("e2e task lifecycle", () => {
  it("runs import, update, attachment upload and analytics in one flow", async () => {
    const app = await loadApp();
    const user = await registerUser(app, "E2E");

    const csv = ["Task,Completed,Importance,Due Date", "Release prep,no,high,2026-03-12"].join("\n");
    const imported = await request(app)
      .post("/tasks/import")
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", Buffer.from(csv, "utf8"), "tasks.csv");
    expect(imported.status).toBe(201);
    expect(imported.body.created).toBe(1);

    const listed = await request(app).get("/tasks").set("Authorization", `Bearer ${user.token}`);
    expect(listed.status).toBe(200);
    const taskId = listed.body.items[0]._id as string;

    const updated = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${user.token}`)
      .send({ status: "done" });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe("done");

    const attachment = await request(app)
      .post(`/tasks/${taskId}/attachments`)
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", Buffer.from("release notes", "utf8"), "release.txt");
    expect(attachment.status).toBe(201);

    const analytics = await request(app).get("/analytics/summary").set("Authorization", `Bearer ${user.token}`);
    expect(analytics.status).toBe(200);
    expect(analytics.body.totals.total).toBe(1);
    expect(analytics.body.totals.done).toBe(1);
  });
});
