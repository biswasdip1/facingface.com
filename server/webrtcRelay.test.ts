import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWebRtcRelayConfig } from "./webrtcRelay";

const ENV_KEYS = [
  "CLOUDFLARE_TURN_KEY_ID",
  "CLOUDFLARE_TURN_API_TOKEN",
  "CLOUDFLARE_TURN_TTL_SECONDS",
  "METERED_TURN_APP_NAME",
  "METERED_TURN_API_KEY",
  "METERED_TURN_REGION",
  "WEBRTC_TURN_URLS",
  "WEBRTC_TURN_USERNAME",
  "WEBRTC_TURN_CREDENTIAL",
] as const;

let originalEnvironment: Record<string, string | undefined>;

beforeEach(() => {
  originalEnvironment = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  ENV_KEYS.forEach((key) => delete process.env[key]);
  vi.restoreAllMocks();
});

afterEach(() => {
  ENV_KEYS.forEach((key) => {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  });
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getWebRtcRelayConfig", () => {
  it("uses the safe STUN fallback when no relay is configured", async () => {
    const config = await getWebRtcRelayConfig();

    expect(config).toMatchObject({ relayConfigured: false, relayProvider: "none" });
    expect(config.iceServers).toEqual(expect.arrayContaining([
      expect.objectContaining({ urls: "stun:stun.l.google.com:19302" }),
    ]));
  });

  it("generates temporary Cloudflare browser ICE entries from server-only credentials", async () => {
    process.env.CLOUDFLARE_TURN_KEY_ID = "turn-key-id";
    process.env.CLOUDFLARE_TURN_API_TOKEN = "server-only-cloudflare-token";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      iceServers: [
        { urls: ["stun:stun.cloudflare.com:3478"] },
        {
          urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"],
          username: "temporary-user",
          credential: "temporary-password",
        },
        { urls: "https://unsafe.example.test/credential" },
      ],
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const config = await getWebRtcRelayConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://rtc.live.cloudflare.com/v1/turn/keys/turn-key-id/credentials/generate-ice-servers",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer server-only-cloudflare-token" }),
        body: JSON.stringify({ ttl: 3600 }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(config).toMatchObject({ relayConfigured: true, relayProvider: "cloudflare" });
    expect(config.iceServers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        urls: ["turn:turn.cloudflare.com:3478?transport=udp", "turns:turn.cloudflare.com:443?transport=tcp"],
        username: "temporary-user",
        credential: "temporary-password",
      }),
    ]));
    expect(JSON.stringify(config.iceServers)).not.toContain("https://unsafe.example.test");
  });

  it("uses the configured Cloudflare TTL only within the provider's permitted range", async () => {
    process.env.CLOUDFLARE_TURN_KEY_ID = "turn-key-id";
    process.env.CLOUDFLARE_TURN_API_TOKEN = "server-only-cloudflare-token";
    process.env.CLOUDFLARE_TURN_TTL_SECONDS = "7200";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      iceServers: [{ urls: "turn:turn.cloudflare.com:3478", username: "user", credential: "credential" }],
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    await getWebRtcRelayConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ ttl: 7200 }) }),
    );
  });

  it("returns static TURN settings only when credentials and a TURN URL are supplied", async () => {
    process.env.WEBRTC_TURN_URLS = " turn:relay.example.test:3478?transport=udp , turns:relay.example.test:443 ";
    process.env.WEBRTC_TURN_USERNAME = "call-user";
    process.env.WEBRTC_TURN_CREDENTIAL = "short-lived-credential";

    const config = await getWebRtcRelayConfig();

    expect(config).toMatchObject({ relayConfigured: true, relayProvider: "static" });
    expect(config.iceServers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        urls: ["turn:relay.example.test:3478?transport=udp", "turns:relay.example.test:443"],
        username: "call-user",
        credential: "short-lived-credential",
      }),
    ]));
  });

  it("rejects unsafe URLs and incomplete static credentials", async () => {
    process.env.WEBRTC_TURN_URLS = "https://not-a-turn-server.example.test, stun:stun.example.test:3478";
    process.env.WEBRTC_TURN_USERNAME = "user-without-turn";
    process.env.WEBRTC_TURN_CREDENTIAL = "credential-without-turn";

    const config = await getWebRtcRelayConfig();

    expect(config).toMatchObject({ relayConfigured: false, relayProvider: "none" });
    expect(config.iceServers.every((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      return urls.every((url) => /^(stun|turn|turns):/i.test(url));
    })).toBe(true);
  });

  it("gets and sanitises Metered ICE credentials using a mocked provider response", async () => {
    process.env.METERED_TURN_APP_NAME = "facingface";
    process.env.METERED_TURN_API_KEY = "server-only-api-key";
    process.env.METERED_TURN_REGION = "global";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([
      { urls: "stun:stun.relay.metered.ca:80" },
      { urls: ["turn:global.relay.metered.ca:80?transport=udp", "turns:global.relay.metered.ca:443?transport=tcp"], username: "temporary-user", credential: "temporary-password" },
      { urls: "https://unsafe.example.test/credential" },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const config = await getWebRtcRelayConfig();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.objectContaining({ href: expect.stringContaining("https://facingface.metered.live/api/v1/turn/credentials?apiKey=server-only-api-key&region=global") }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(config).toMatchObject({ relayConfigured: true, relayProvider: "metered" });
    expect(config.iceServers).toEqual(expect.arrayContaining([
      expect.objectContaining({
        urls: ["turn:global.relay.metered.ca:80?transport=udp", "turns:global.relay.metered.ca:443?transport=tcp"],
        username: "temporary-user",
        credential: "temporary-password",
      }),
    ]));
    expect(JSON.stringify(config.iceServers)).not.toContain("https://unsafe.example.test");
  });
});
