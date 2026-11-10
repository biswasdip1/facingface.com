export interface NativeDraft {
  id: string;
  text: string;
  imageDataUrl?: string;
}

declare global {
  interface Window {
    __FACINGFACE_NATIVE__?: boolean;
    __FACINGFACE_PLATFORM__?: "ios" | "android";
    __FACINGFACE_BILLING_MODE__?: "free";
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

export const isNativeApp = (): boolean =>
  typeof window !== "undefined" && window.__FACINGFACE_NATIVE__ === true;

export const isFreeNativeEdition = (): boolean =>
  isNativeApp() && window.__FACINGFACE_BILLING_MODE__ === "free";

export const NATIVE_DRAFT_KEY = "facingface-native-draft-v1";

export function parseNativeDraft(value: unknown): NativeDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as Partial<NativeDraft>;
  if (typeof draft.id !== "string" || draft.id.length > 100 || typeof draft.text !== "string" || draft.text.length > 6000) return null;
  if (draft.imageDataUrl !== undefined && (typeof draft.imageDataUrl !== "string" || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(draft.imageDataUrl) || draft.imageDataUrl.length > 4_200_000)) return null;
  return { id: draft.id, text: draft.text, imageDataUrl: draft.imageDataUrl };
}

// Native share requests are user initiated. Website-only sessions keep their
// existing Web Share API (if any) and browser clipboard fallback.
export function installNativeShareBridge(): void {
  if (!isNativeApp() || !window.ReactNativeWebView) return;
  const share = (data: ShareData = {}): Promise<void> => {
    const title = String(data.title ?? "FacingFace").slice(0, 200);
    const text = String(data.text ?? "").slice(0, 6000);
    const url = String(data.url ?? "");
    if (data.files?.length) return Promise.reject(new Error("Sharing files from the website is unavailable. Use the app's draft tools."));
    if (url) {
      try { if (new URL(url).protocol !== "https:") return Promise.reject(new Error("Only secure links can be shared.")); }
      catch { return Promise.reject(new Error("Invalid share link.")); }
    }
    const requestId = `share-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise<void>((resolve, reject) => {
      const onReply = (event: Event) => {
        const detail = (event as CustomEvent).detail;
        if (detail?.requestId !== requestId) return;
        cleanup();
        if (detail.ok) resolve(); else reject(new Error(detail.error || "Sharing was cancelled."));
      };
      const timer = window.setTimeout(() => { cleanup(); reject(new Error("Share request timed out.")); }, 120000);
      const cleanup = () => { window.clearTimeout(timer); window.removeEventListener("facingface:native-result", onReply); };
      window.addEventListener("facingface:native-result", onReply);
      window.ReactNativeWebView!.postMessage(JSON.stringify({ type: "share", requestId, title, text, url }));
    });
  };
  try { Object.defineProperty(navigator, "share", { configurable: true, value: share }); }
  catch { /* Native toolbar sharing remains available if WebKit locks this property. */ }
}
