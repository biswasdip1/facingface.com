import { describe, expect, it, vi } from "vitest";
import { removeReportedContent, wasRecipientAccepted } from "./moderationActions";

function createDependencies() {
  return {
    deletePost: vi.fn().mockResolvedValue(undefined),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    removeListing: vi.fn().mockResolvedValue(undefined),
  };
}

describe("removeReportedContent", () => {
  it("removes the exact reported post", async () => {
    const dependencies = createDependencies();
    await removeReportedContent("post", 41, 7, dependencies);
    expect(dependencies.deletePost).toHaveBeenCalledTimes(1);
    expect(dependencies.deletePost).toHaveBeenCalledWith(41);
    expect(dependencies.deleteComment).not.toHaveBeenCalled();
    expect(dependencies.removeListing).not.toHaveBeenCalled();
  });

  it("removes the exact reported comment", async () => {
    const dependencies = createDependencies();
    await removeReportedContent("comment", 52, 7, dependencies);
    expect(dependencies.deleteComment).toHaveBeenCalledTimes(1);
    expect(dependencies.deleteComment).toHaveBeenCalledWith(52);
    expect(dependencies.deletePost).not.toHaveBeenCalled();
  });

  it("removes the exact reported listing with the reviewing administrator", async () => {
    const dependencies = createDependencies();
    await removeReportedContent("listing", 63, 8, dependencies);
    expect(dependencies.removeListing).toHaveBeenCalledTimes(1);
    expect(dependencies.removeListing).toHaveBeenCalledWith(63, 8);
  });

  it("rejects unsupported report types without deleting content", async () => {
    const dependencies = createDependencies();
    await expect(removeReportedContent("profile", 75, 9, dependencies)).rejects.toThrow("Unsupported reported content type.");
    expect(dependencies.deletePost).not.toHaveBeenCalled();
    expect(dependencies.deleteComment).not.toHaveBeenCalled();
    expect(dependencies.removeListing).not.toHaveBeenCalled();
  });
});

describe("wasRecipientAccepted", () => {
  it("accepts a case-insensitive Gmail acknowledgement for the exact reporter", () => {
    expect(wasRecipientAccepted(["MEMBER@example.com"], "member@example.com")).toBe(true);
  });

  it("does not claim delivery when Gmail accepted a different recipient", () => {
    expect(wasRecipientAccepted(["other@example.com"], "member@example.com")).toBe(false);
  });
});
