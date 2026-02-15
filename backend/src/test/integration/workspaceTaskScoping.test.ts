import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApp, registerUser } from "../helpers";

describe("workspace task scoping", () => {
  it("allows workspace members to access scoped tasks and blocks outsiders", async () => {
    const app = await loadApp();
    const owner = await registerUser(app, "WS Owner");
    const member = await registerUser(app, "WS Member");
    const outsider = await registerUser(app, "WS Outsider");

    const workspace = await request(app)
      .post("/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Scoped Workspace" });
    expect(workspace.status).toBe(201);
    const workspaceId = workspace.body._id as string;

    const invite = await request(app)
      .post(`/workspaces/${workspaceId}/invites`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: member.email, role: "member", expiresInDays: 7 });
    expect(invite.status).toBe(201);

    const accept = await request(app)
      .post("/workspaces/invites/accept")
      .set("Authorization", `Bearer ${member.token}`)
      .send({ token: invite.body.token });
    expect(accept.status).toBe(200);

    const outsiderCreate = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ title: "Forbidden task", workspaceId });
    expect(outsiderCreate.status).toBe(403);

    const ownerCreate = await request(app)
      .post("/tasks")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Workspace task", workspaceId, status: "todo", priority: "high" });
    expect(ownerCreate.status).toBe(201);

    const outsiderList = await request(app)
      .get(`/tasks?workspaceId=${workspaceId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderList.status).toBe(403);

    const memberList = await request(app)
      .get(`/tasks?workspaceId=${workspaceId}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(memberList.status).toBe(200);
    expect(memberList.body.items).toHaveLength(1);
    expect(memberList.body.items[0].workspaceId).toBe(workspaceId);
  });
});

