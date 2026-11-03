import { z } from "zod";

/** Includes the local caller. Keep client UI and durable admission in sync. */
export const GROUP_CALL_MAX_PARTICIPANTS = 4;
/** joinedAt is the existing durable last-heartbeat field; no migration needed. */
export const GROUP_CALL_STALE_MS = 45_000;
export const GROUP_CALL_SIGNAL_MAX_BYTES = 64 * 1024;
export const GROUP_CALL_SIGNAL_TYPES = ["offer", "answer", "ice-candidate"] as const;
export type GroupCallSignalType = (typeof GROUP_CALL_SIGNAL_TYPES)[number];

const descriptionSchema = z.object({
  type: z.enum(["offer", "answer"]),
  sdp: z.string().min(1),
}).strict();
const candidateSchema = z.object({
  candidate: z.string(),
  sdpMid: z.string().nullable().optional(),
  sdpMLineIndex: z.number().int().nonnegative().nullable().optional(),
  usernameFragment: z.string().nullable().optional(),
}).strict();

/** Wire payload stays JSON text, matching RTCSessionDescription/RTCIceCandidate.toJSON(). */
export function validGroupCallSignalPayload(type: GroupCallSignalType, payload: string): boolean {
  if (payload.length > GROUP_CALL_SIGNAL_MAX_BYTES || new TextEncoder().encode(payload).byteLength > GROUP_CALL_SIGNAL_MAX_BYTES) return false;
  try {
    const parsed: unknown = JSON.parse(payload);
    if (type === "ice-candidate") return candidateSchema.safeParse(parsed).success;
    const description = descriptionSchema.safeParse(parsed);
    return description.success && description.data.type === type;
  } catch {
    return false;
  }
}

export const groupCallSignalInputSchema = z.object({
  roomId: z.number().int().positive(),
  toUserId: z.number().int().positive(),
  type: z.enum(GROUP_CALL_SIGNAL_TYPES),
  payload: z.string().max(GROUP_CALL_SIGNAL_MAX_BYTES),
}).refine(input => validGroupCallSignalPayload(input.type, input.payload), {
  message: "Invalid WebRTC description/candidate or payload exceeds 64 KB.",
  path: ["payload"],
});
