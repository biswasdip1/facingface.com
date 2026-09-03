import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isContentModerationEnabled, moderateContent } from "./moderation";

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

const originalEnabled = process.env.CONTENT_MODERATION_ENABLED;

beforeEach(() => {
  process.env.CONTENT_MODERATION_ENABLED = "true";
  vi.clearAllMocks();
});

afterEach(() => {
  if (originalEnabled === undefined) delete process.env.CONTENT_MODERATION_ENABLED;
  else process.env.CONTENT_MODERATION_ENABLED = originalEnabled;
});

describe("moderateContent", () => {
  it("returns not flagged for empty text", async () => {
    const result = await moderateContent("");
    expect(result).toMatchObject({ flagged: false, isSexual: false });
  });

  it("disables external moderation unless it is explicitly enabled", async () => {
    process.env.CONTENT_MODERATION_ENABLED = "false";
    const { invokeLLM } = await import("./_core/llm");

    expect(isContentModerationEnabled()).toBe(false);
    await expect(moderateContent("An ordinary post")).resolves.toMatchObject({ flagged: false, isSexual: false });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("returns not flagged when an enabled provider says the text is clean", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: '{"flagged":false,"isSexual":false}' } }],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    await expect(moderateContent("Hello, world!")).resolves.toMatchObject({ flagged: false, isSexual: false });
  });

  it("returns an enabled-provider flag and reason", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      choices: [{ message: { content: '{"flagged":true,"isSexual":false,"reason":"Hate speech detected"}' } }],
    } as ReturnType<typeof invokeLLM> extends Promise<infer T> ? T : never);

    await expect(moderateContent("offensive content here")).resolves.toMatchObject({
      flagged: true,
      isSexual: false,
      reason: "Hate speech detected",
    });
  });

  it("fails open when an enabled provider is unavailable", async () => {
    const { invokeLLM } = await import("./_core/llm");
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("LLM service unavailable"));

    await expect(moderateContent("some text")).resolves.toMatchObject({ flagged: false, isSexual: false });
  });
});
