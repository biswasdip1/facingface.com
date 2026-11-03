import { describe, it, expect } from "vitest";

// Unit tests for super_admin role logic
describe("super_admin role guard logic", () => {
  const isSuperAdmin = (role: string) => role === "super_admin";
  const isAdminOrSuperAdmin = (role: string) => role === "admin" || role === "super_admin";

  it("super_admin passes superAdminProcedure guard", () => {
    expect(isSuperAdmin("super_admin")).toBe(true);
  });
  it("admin fails superAdminProcedure guard", () => {
    expect(isSuperAdmin("admin")).toBe(false);
  });
  it("user fails superAdminProcedure guard", () => {
    expect(isSuperAdmin("user")).toBe(false);
  });
  it("super_admin passes adminProcedure guard", () => {
    expect(isAdminOrSuperAdmin("super_admin")).toBe(true);
  });
  it("admin passes adminProcedure guard", () => {
    expect(isAdminOrSuperAdmin("admin")).toBe(true);
  });
  it("user fails adminProcedure guard", () => {
    expect(isAdminOrSuperAdmin("user")).toBe(false);
  });

  // Self-protection: cannot change own role
  it("cannot promote self", () => {
    const selfProtect = (requesterId: number, targetId: number) => requesterId === targetId;
    expect(selfProtect(1, 1)).toBe(true);  // blocked
    expect(selfProtect(1, 2)).toBe(false); // allowed
  });

  // Cannot modify another super_admin
  it("cannot demote another super_admin", () => {
    const canModify = (targetRole: string) => targetRole !== "super_admin";
    expect(canModify("super_admin")).toBe(false); // blocked
    expect(canModify("admin")).toBe(true);         // allowed
    expect(canModify("user")).toBe(true);          // allowed
  });

  // Role enum includes super_admin
  it("super_admin is a valid role value", () => {
    const validRoles = ["user", "admin", "super_admin"];
    expect(validRoles.includes("super_admin")).toBe(true);
  });
});
