import type { CSSProperties } from "react";

export const FACINGFACE_MARK = "/brand/facingface-mark-192-20261103.png";
export const FACINGFACE_CHAT_MARK = "/brand/facingface-chat-192-20261103.png";

/** One permanent same-domain brand mark; user avatars are never replaced. */
export default function BrandMark({
  size = 32,
  chat = false,
  className = "",
  decorative = false,
  style,
}: {
  size?: number;
  chat?: boolean;
  className?: string;
  decorative?: boolean;
  style?: CSSProperties;
}) {
  return (
    <img
      src={chat ? FACINGFACE_CHAT_MARK : FACINGFACE_MARK}
      alt={decorative ? "" : chat ? "FacingFace Chat logo" : "FacingFace logo"}
      aria-hidden={decorative || undefined}
      width={size}
      height={size}
      className={className}
      decoding="async"
      draggable={false}
      style={{
        display: "block",
        flexShrink: 0,
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: Math.max(4, Math.round(size * 0.17)),
        backgroundColor: "#e63329",
        ...style,
      }}
    />
  );
}
