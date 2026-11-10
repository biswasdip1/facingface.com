export const LIVE_FALLBACK_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export async function applyLiveIce(
  peer: RTCPeerConnection,
  pending: RTCIceCandidateInit[]
): Promise<void> {
  if (!peer.remoteDescription) return;
  for (const candidate of pending.splice(0)) {
    try {
      await peer.addIceCandidate(candidate);
    } catch {
      /* a closed/replaced peer can reject late ICE */
    }
  }
}

export function liveCameraError(error: unknown): string {
  const name =
    error &&
    typeof error === "object" &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera or microphone permission was denied. Allow both in your browser's site settings, then try again.";
  if (name === "NotFoundError")
    return "No camera or microphone was found. Connect both before going live.";
  if (name === "NotReadableError")
    return "Your camera or microphone is busy. Close other apps using it, then try again.";
  return "Could not start your camera and microphone. Check their permissions and connection, then try again.";
}
