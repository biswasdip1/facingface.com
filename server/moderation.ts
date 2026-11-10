import { invokeLLM } from "./_core/llm";

export interface ModerationResult {
  flagged: boolean;
  isSexual: boolean;   // true when the primary violation is explicit/sexual content
  reason?: string;
}

const moderationResponseFormat = {
  type: "json_schema" as const,
  json_schema: {
    name: "moderation_result",
    strict: true,
    schema: {
      type: "object",
      properties: {
        flagged: { type: "boolean", description: "Whether the content is inappropriate" },
        isSexual: { type: "boolean", description: "Whether the primary violation is sexual/explicit content" },
        reason: { type: "string", description: "Reason for flagging, if flagged" },
      },
      required: ["flagged", "isSexual"],
      additionalProperties: false,
    },
  },
};

let didReportDisabledModeration = false;
let didReportProviderFailure = false;

/**
 * The existing Render deployment has an invalid Forge key. Calling that remote
 * service for every image both fails open and writes a noisy 401 stack trace.
 * Explicitly enable moderation only after a valid provider key is configured.
 */
export function isContentModerationEnabled(): boolean {
  return process.env.CONTENT_MODERATION_ENABLED?.trim().toLowerCase() === "true";
}

function unflagged(): ModerationResult {
  return { flagged: false, isSexual: false };
}

function skipWhenDisabled(): ModerationResult {
  if (!didReportDisabledModeration) {
    didReportDisabledModeration = true;
    console.info(
      "[Moderation] External AI moderation is disabled. Uploads are allowed without an external scan; set CONTENT_MODERATION_ENABLED=true only after configuring a valid provider key.",
    );
  }
  return unflagged();
}

function parseModerationResponse(response: Awaited<ReturnType<typeof invokeLLM>>): ModerationResult {
  const rawContent = response?.choices?.[0]?.message?.content;
  if (!rawContent) return unflagged();
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  const parsed = JSON.parse(content) as Partial<ModerationResult>;
  return {
    flagged: parsed.flagged === true,
    isSexual: parsed.isSexual === true,
    ...(parsed.reason ? { reason: parsed.reason } : {}),
  };
}

/**
 * Checks text only when an external provider has been explicitly enabled.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) return unflagged();
  if (!isContentModerationEnabled()) return skipWhenDisabled();

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a content moderation assistant for a social media platform.
Analyze the following user-submitted text and determine if it contains any of these violations:
- "sexual": Explicit sexual content, nudity descriptions, pornographic material, or sexual solicitation
- "hate": Hate speech, discrimination, or slurs targeting protected groups
- "violence": Graphic violence, threats of harm, or self-harm encouragement
- "harassment": Targeted bullying or harassment of individuals
- "spam": Spam, scam, or phishing content
- "misinformation": Dangerous health/safety misinformation

Respond ONLY with valid JSON in this exact format:
{"flagged": false, "isSexual": false}
or
{"flagged": true, "isSexual": true, "reason": "Brief explanation"}
or
{"flagged": true, "isSexual": false, "reason": "Brief explanation"}

Set isSexual to true ONLY when the primary violation category is "sexual".
Important Nepali-language context: the word "ठोक्नु" can be a normal non-sexual verb meaning to hit, strike, knock, fix, or do something. Do NOT flag content as sexual only because this word appears. Flag it as sexual only when the surrounding sentence clearly contains explicit sexual content, nudity descriptions, pornography, or sexual solicitation.
Do not include any other text outside the JSON.`,
        },
        { role: "user", content: text },
      ],
      response_format: moderationResponseFormat,
    });

    return parseModerationResponse(response);
  } catch (error) {
    // Fail open, as before, but report a provider outage only once per process.
    if (!didReportProviderFailure) {
      didReportProviderFailure = true;
      console.warn("[Moderation] Provider request failed; further moderation calls are being skipped until restart.");
    }
    return unflagged();
  }
}

/**
 * Uses a vision-capable LLM to scan uploaded image bytes only when explicitly
 * enabled. Video moderation calls this function for sampled video frames.
 */
export async function moderateImageBuffer(
  buffer: Buffer,
  mimeType = "image/jpeg",
  context = "uploaded media",
): Promise<ModerationResult> {
  if (!buffer || buffer.length === 0) return unflagged();
  if (!isContentModerationEnabled()) return skipWhenDisabled();
  if (didReportProviderFailure) return unflagged();

  try {
    const safeMimeType = mimeType.startsWith("image/") ? mimeType : "image/jpeg";
    const dataUrl = `data:${safeMimeType};base64,${buffer.toString("base64")}`;
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a visual content moderation assistant for a social media platform.
Analyze the uploaded image or video frame and determine whether it contains any of these violations:
- "sexual": nudity, visible genitals, explicit sexual activity, pornography, sexualized minors, or clearly sexual image/video content
- "violence": graphic violence, gore, or credible threats shown visually
- "hate": hateful symbols or targeted hateful visual content
- "harassment": targeted abusive visual content

Respond ONLY with valid JSON in this exact format:
{"flagged": false, "isSexual": false}
or
{"flagged": true, "isSexual": true, "reason": "Brief explanation"}
or
{"flagged": true, "isSexual": false, "reason": "Brief explanation"}

Set isSexual to true when the visual content includes nudity, pornography, explicit sexual activity, or sexualized minors. Do not flag normal fully-clothed selfies, family photos, breastfeeding, medical/non-sexual anatomy, or swimwear unless the image is clearly explicit or pornographic. Do not include any other text outside the JSON.`,
        },
        {
          role: "user",
          content: [
            { type: "text", text: `Moderate this ${context}.` },
            { type: "image_url", image_url: { url: dataUrl, detail: "low" } },
          ],
        },
      ],
      response_format: moderationResponseFormat,
    });

    return parseModerationResponse(response);
  } catch (error) {
    if (!didReportProviderFailure) {
      didReportProviderFailure = true;
      console.warn("[Moderation] Provider request failed; further moderation calls are being skipped until restart.");
    }
    return unflagged();
  }
}
