import { describe, expect, it, vi } from "vitest";
import { moderateContent } from "./moderation";

// Mock the LLM invocation
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

describe("moderateContent", () => {
  it("returns not flagged for empty text", async () => {
    const result = await moderateContent("");
    expect(result.flagged).toBe(false);
  });

  it("returns not flagged for whitespace-only text", async () => {
    const result = await moderateContent("   ");
    expect(result.flagged).toBe(false);
  });

  it("returns not flagged when LLM says clean", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: '{"flagged":false}' } }],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    const result = await moderateContent("Hello, world!");
    expect(result.flagged).toBe(false);
  });

  it("returns flagged when LLM flags content", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: '{"flagged":true,"reason":"Hate speech detected"}' } }],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    const result = await moderateContent("offensive content here");
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe("Hate speech detected");
  });

  it("fails open (not flagged) when LLM throws an error", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM service unavailable"));

    const result = await moderateContent("some text");
    expect(result.flagged).toBe(false);
  });

  it("fails open when LLM returns no content", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    } as unknown as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    const result = await moderateContent("some text");
    expect(result.flagged).toBe(false);
  });
});
