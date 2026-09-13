export type WebRtcIceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

const DEFAULT_STUN_SERVERS: WebRtcIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const safeUrl = (url: unknown): url is string =>
  typeof url === "string" && /^(stun|turn|turns):/i.test(url.trim());

function hasTurnServer(iceServers: WebRtcIceServer[]): boolean {
  return iceServers.some((server) => {
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    return urls.some((url) => /^turns?:/i.test(url));
  });
}

function sanitiseIceServers(value: unknown): WebRtcIceServer[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    const urls = Array.isArray(raw.urls)
      ? raw.urls.filter(safeUrl)
      : safeUrl(raw.urls) ? raw.urls : undefined;
    if (!urls || (Array.isArray(urls) && urls.length === 0)) return [];
    const username = typeof raw.username === "string" ? raw.username : undefined;
    const credential = typeof raw.credential === "string" ? raw.credential : undefined;
    return [{ urls, ...(username ? { username } : {}), ...(credential ? { credential } : {}) }];
  });
}

function cloudflareCredentialTtlSeconds(): number {
  const configuredTtl = Number.parseInt(process.env.CLOUDFLARE_TURN_TTL_SECONDS ?? "", 10);
  // Cloudflare supports credentials up to 48 hours. One hour is sufficient for
  // FacingFace's existing 30-minute call limit and keeps credentials short-lived.
  if (Number.isFinite(configuredTtl) && configuredTtl >= 1_800 && configuredTtl <= 172_800) {
    return configuredTtl;
  }
  return 3_600;
}

export type WebRtcRelayConfig = {
  iceServers: WebRtcIceServer[];
  relayConfigured: boolean;
  relayProvider: "cloudflare" | "metered" | "static" | "none";
};

/**
 * Returns browser-safe ICE entries. Provider API keys stay on the server;
 * browsers receive only temporary or credential-scoped ICE results.
 */
export async function getWebRtcRelayConfig(): Promise<WebRtcRelayConfig> {
  const cloudflareTurnKeyId = process.env.CLOUDFLARE_TURN_KEY_ID?.trim();
  const cloudflareTurnApiToken = process.env.CLOUDFLARE_TURN_API_TOKEN?.trim();

  if (cloudflareTurnKeyId && cloudflareTurnApiToken) {
    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(cloudflareTurnKeyId)}/credentials/generate-ice-servers`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cloudflareTurnApiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ttl: cloudflareCredentialTtlSeconds() }),
          signal: AbortSignal.timeout(8_000),
        },
      );
      if (response.ok) {
        const payload = await response.json() as { iceServers?: unknown };
        const iceServers = sanitiseIceServers(payload.iceServers);
        if (hasTurnServer(iceServers)) {
          return { iceServers, relayConfigured: true, relayProvider: "cloudflare" };
        }
      }
    } catch {
      // Keep call setup available with STUN fallback if the provider is briefly unavailable.
    }
  }

  const rawMeteredAppName = process.env.METERED_TURN_APP_NAME?.trim();
  // Metered app names are DNS labels. Reject anything else rather than using
  // a malformed environment value to construct an outbound request.
  const meteredAppName = rawMeteredAppName && /^[a-z0-9-]+$/i.test(rawMeteredAppName)
    ? rawMeteredAppName
    : undefined;
  const meteredApiKey = process.env.METERED_TURN_API_KEY?.trim();

  if (meteredAppName && meteredApiKey) {
    try {
      const endpoint = new URL(`https://${meteredAppName}.metered.live/api/v1/turn/credentials`);
      endpoint.searchParams.set("apiKey", meteredApiKey);
      endpoint.searchParams.set("region", process.env.METERED_TURN_REGION?.trim() || "global");
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
      if (response.ok) {
        const iceServers = sanitiseIceServers(await response.json());
        if (hasTurnServer(iceServers)) {
          return { iceServers, relayConfigured: true, relayProvider: "metered" };
        }
      }
    } catch {
      // Keep call setup available with STUN fallback if the provider is briefly unavailable.
    }
  }

  const rawUrls = process.env.WEBRTC_TURN_URLS?.split(",").map((url) => url.trim()).filter(safeUrl) ?? [];
  const username = process.env.WEBRTC_TURN_USERNAME?.trim();
  const credential = process.env.WEBRTC_TURN_CREDENTIAL?.trim();
  if (rawUrls.some((url) => /^turns?:/i.test(url)) && username && credential) {
    return {
      iceServers: [...DEFAULT_STUN_SERVERS, { urls: rawUrls, username, credential }],
      relayConfigured: true,
      relayProvider: "static",
    };
  }

  return { iceServers: DEFAULT_STUN_SERVERS, relayConfigured: false, relayProvider: "none" };
}

export const FALLBACK_STUN_SERVERS = DEFAULT_STUN_SERVERS;
