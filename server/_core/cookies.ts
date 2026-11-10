import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isLocalHost(host: string) {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return LOCAL_HOSTS.has(normalized) || isIpAddress(normalized);
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https" || req.secure) return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostHeader = req.hostname || req.headers.host || "";
  const secure = isSecureRequest(req) || !isLocalHost(hostHeader);

  return {
    httpOnly: true,
    path: "/",
    // Lax is enough for this same-site app and avoids Chrome rejecting
    // SameSite=None cookies when a reverse proxy does not report HTTPS clearly.
    sameSite: "lax",
    secure,
  };
}
