import { describe, expect, it } from "vitest";
import { canManageMembers, canReadProject, canWriteProject } from "../../services/projectAccessService";

describe("projectAccessService", () => {
  it("grants read to any membership role", () => {
    expect(canReadProject("owner")).toBe(true);
    expect(canReadProject("admin")).toBe(true);
    expect(canReadProject("member")).toBe(true);
    expect(canReadProject("viewer")).toBe(true);
    expect(canReadProject(null)).toBe(false);
  });

  it("grants write only to owner/admin/member", () => {
    expect(canWriteProject("owner")).toBe(true);
    expect(canWriteProject("admin")).toBe(true);
    expect(canWriteProject("member")).toBe(true);
    expect(canWriteProject("viewer")).toBe(false);
    expect(canWriteProject(null)).toBe(false);
  });

  it("grants member management only to owner/admin", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
    expect(canManageMembers("viewer")).toBe(false);
    expect(canManageMembers(null)).toBe(false);
  });
});

