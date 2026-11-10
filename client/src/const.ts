export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// FacingFace email/password login works without the optional external OAuth portal.
// A missing portal must not throw while rendering the public landing screen.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  if (!oauthPortalUrl || !appId || typeof window === "undefined") return "/";
  try {
    const portal = new URL(oauthPortalUrl);
    if (portal.protocol !== "https:" && portal.hostname !== "localhost") return "/";
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const url = new URL("/app-auth", portal);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", btoa(redirectUri));
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return "/";
  }
};
