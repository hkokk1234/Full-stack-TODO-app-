import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApp, registerUser } from "../helpers";

describe("sharing ACL", () => {
  it("enforces viewer/editor permissions for shared personal tasks", async () => {
    const app = await loadApp();
    const owner = await registerUser(app, "Owner");
    const collaborator = await registerUser(app, "Collaborator");
    const outsider = await registerUser(app, "Outsider");

    const createTask = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Shared task candidate", status: "todo", priority: "medium" });
    expect(createTask.status).toBe(201);
    const taskId = createTask.body._id as string;

    const outsiderReadShares = await request(app)
      .get(`/tasks/${taskId}/shares`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderReadShares.status).toBe(403);

    const shareViewer = await request(app)
      .post(`/tasks/${taskId}/shares`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: collaborator.email, permission: "viewer" });
    expect(shareViewer.status).toBe(200);
    expect(shareViewer.body.permission).toBe("viewer");

    const viewerCannotUpdate = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${collaborator.token}`)
      .send({ status: "in_progress" });
    expect(viewerCannotUpdate.status).toBe(403);

    const promoteToEditor = await request(app)
      .post(`/tasks/${taskId}/shares`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: collaborator.email, permission: "editor" });
    expect(promoteToEditor.status).toBe(200);
    expect(promoteToEditor.body.permission).toBe("editor");

    const editorCanUpdate = await request(app)
      .put(`/tasks/${taskId}`)
      .set("Authorization", `Bearer ${collaborator.token}`)
      .send({ status: "in_progress" });
    expect(editorCanUpdate.status).toBe(200);
    expect(editorCanUpdate.body.status).toBe("in_progress");
  });
});
