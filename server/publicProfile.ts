import type { User } from "../drizzle/schema";

export type PublicProfile = Pick<User,
  "id" | "name" | "avatar" | "coverPhoto" | "coverCropY" | "bio" | "hometown" |
  "currentLocation" | "currentRole" | "website" | "youtubeChannel" | "birthDay" |
  "birthMonth" | "hobby" | "isVerified" | "createdAt"
>;

/** Only fields intended for member-facing profiles. Never spread an auth row. */
export function toPublicProfile(user: PublicProfile): PublicProfile {
  return {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    coverPhoto: user.coverPhoto,
    coverCropY: user.coverCropY,
    bio: user.bio,
    hometown: user.hometown,
    currentLocation: user.currentLocation,
    currentRole: user.currentRole,
    website: user.website,
    youtubeChannel: user.youtubeChannel,
    birthDay: user.birthDay,
    birthMonth: user.birthMonth,
    hobby: user.hobby,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
}

/** Contact details remain private; preserve the profile editor's own-phone field. */
export function toProfileForViewer(user: User, viewerId: number, viewerRole: User["role"] = "user") {
  return {
    ...toPublicProfile(user),
    phone: user.id === viewerId ? user.phone : null,
    suspendedUntil: viewerRole === "admin" || viewerRole === "super_admin" ? user.suspendedUntil : null,
  };
}
