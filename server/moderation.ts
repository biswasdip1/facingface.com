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

function parseModerationResponse(response: Awaited<ReturnType<typeof invokeLLM>>): ModerationResult {
  const rawContent = response?.choices?.[0]?.message?.content;
  if (!rawContent) return { flagged: false, isSexual: false };
  const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent);
  return JSON.parse(content) as ModerationResult;
}

/**
 * Uses the LLM to check if content is appropriate before publishing.
 * Returns { flagged: true, isSexual: true, reason: "..." } for sexual/explicit content.
 * Returns { flagged: true, isSexual: false, reason: "..." } for other violations.
 */
export async function moderateContent(text: string): Promise<ModerationResult> {
  if (!text || text.trim().length === 0) {
    return { flagged: false, isSexual: false };
  }

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
        {
          role: "user",
          content: text,
        },
      ],
      response_format: moderationResponseFormat,
    });

    return parseModerationResponse(response);
  } catch (err) {
    console.error("[Moderation] Error calling LLM:", err);
    // On error, allow content through (fail open) to avoid blocking legitimate users
    return { flagged: false, isSexual: false };
  }
}

/**
 * Uses the vision-capable LLM to check uploaded image bytes before publishing.
 * Video moderation should call this function on sampled frames extracted from the video.
 */
export async function moderateImageBuffer(
  buffer: Buffer,
  mimeType = "image/jpeg",
  context = "uploaded media",
): Promise<ModerationResult> {
  if (!buffer || buffer.length === 0) {
    return { flagged: false, isSexual: false };
  }

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
            {
              type: "text",
              text: `Moderate this ${context}.`,
            },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "low" },
            },
          ],
        },
      ],
      response_format: moderationResponseFormat,
    });

    return parseModerationResponse(response);
  } catch (err) {
    console.error("[Moderation] Error checking visual media:", err);
    // Keep the existing moderation behavior: do not block legitimate uploads if the scanner has a transient provider failure.
    return { flagged: false, isSexual: false };
  }
}
