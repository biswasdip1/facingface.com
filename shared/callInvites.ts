/** Targeted in-app notification only: no media, SDP, ICE, or credentials. */
export const GROUP_CALL_INVITATION_EVENT = "call:group-invitation";

export type GroupCallInvitationPayload = {
  roomId: number;
  groupId: number;
  fromId: number;
  fromName: string;
  type: "audio" | "video";
  /** UTC epoch milliseconds, matching the waiting room's durable deadline. */
  expiresAt: number;
};

export type StartGroupCallInvitationResult = {
  roomId: number;
  groupId: number;
  /** The original peer and selected friends; never the requester. */
  invitedUserIds: number[];
  expiresAt: number;
};
