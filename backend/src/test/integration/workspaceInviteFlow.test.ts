import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApp, registerUser } from "../helpers";

describe("workspace invite flow", () => {
  it("creates workspace, invites user by email and accepts invite", async () => {
    const app = await loadApp();
    const owner = await registerUser(app, "Workspace Owner");
    const invited = await registerUser(app, "Workspace Member");

    const workspace = await request(app)
      .post("/workspaces")
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Acme Workspace" });
    expect(workspace.status).toBe(201);
    const workspaceId = workspace.body._id as string;

    const invite = await request(app)
      .post(`/workspaces/${workspaceId}/invites`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ email: invited.email, role: "member", expiresInDays: 7 });
    expect(invite.status).toBe(201);
    expect(typeof invite.body.token).toBe("string");

    const accept = await request(app)
      .post("/workspaces/invites/accept")
      .set("Authorization", `Bearer ${invited.token}`)
      .send({ token: invite.body.token });
    expect(accept.status).toBe(200);
    expect(accept.body.workspaceId).toBe(workspaceId);
    expect(accept.body.role).toBe("member");

    const members = await request(app)
      .get(`/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${invited.token}`);
    expect(members.status).toBe(200);
    expect(members.body.items).toHaveLength(2);
  });
});

