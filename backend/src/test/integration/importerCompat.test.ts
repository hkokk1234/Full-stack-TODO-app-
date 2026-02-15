import request from "supertest";
import { describe, expect, it } from "vitest";
import { loadApp, registerUser } from "../helpers";

describe("importer compat mode", () => {
  it("maps Todoist/Microsoft-like CSV headers automatically", async () => {
    const app = await loadApp();
    const user = await registerUser(app, "Importer");

    const csv = [
      "Task,Notes,Completed,Importance,Due Date,Website",
      "Pay rent,Monthly payment,yes,high,12/03/2026,https://example.com/rent",
      "Book tickets,Trip prep,no,1,2026-03-25,https://example.com/travel"
    ].join("\n");

    const importResponse = await request(app)
      .post("/tasks/import")
      .set("Authorization", `Bearer ${user.token}`)
      .attach("file", Buffer.from(csv, "utf8"), "compat.csv");

    expect(importResponse.status).toBe(201);
    expect(importResponse.body.created).toBe(2);

    const listResponse = await request(app).get("/tasks").set("Authorization", `Bearer ${user.token}`);
    expect(listResponse.status).toBe(200);

    const items = listResponse.body.items as Array<Record<string, unknown>>;
    const rent = items.find((item) => item.title === "Pay rent");
    const tickets = items.find((item) => item.title === "Book tickets");

    expect(rent?.status).toBe("done");
    expect(rent?.priority).toBe("high");
    expect(tickets?.priority).toBe("low");
  });
});
