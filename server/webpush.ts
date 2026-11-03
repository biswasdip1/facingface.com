import webpush from "web-push";
import type { SendResult } from "web-push";
import { ENV } from "./_core/env";
import { getPushSubscriptionsForUser } from "./db";

let _initialized = false;

function ensureInitialized() {
  if (_initialized) return;
  if (!ENV.vapidPublicKey || !ENV.vapidPrivateKey) {
    console.warn("[WebPush] VAPID keys not configured — push notifications disabled");
    return;
  }
  webpush.setVapidDetails(
    "mailto:admin@facingface.com",
    ENV.vapidPublicKey,
    ENV.vapidPrivateKey
  );
  _initialized = true;
}

async function sendToUser(userId: number, payload: string, ttl: number): Promise<void> {
  const subscriptions = await getPushSubscriptionsForUser(userId);
  if (subscriptions.length === 0) return;
  const results = await Promise.allSettled(
    subscriptions.map((sub: { endpoint: string; p256dh: string; auth: string }) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
        { TTL: ttl }
      )
    )
  );
  const failed = results.filter((r: PromiseSettledResult<SendResult>) => r.status === "rejected").length;
  if (failed > 0) {
    console.warn(`[WebPush] ${failed}/${subscriptions.length} push notifications failed for user ${userId}`);
  }
}

export async function sendCallPushNotification(
  calleeId: number,
  callerName: string,
  callType: "voice" | "video"
): Promise<void> {
  ensureInitialized();
  if (!_initialized) return;
  await sendToUser(calleeId, JSON.stringify({
    type: "incoming_call",
    callerName,
    callType,
    title: `Incoming ${callType} call`,
    body: `${callerName} is calling you`,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "incoming-call",
    requireInteraction: true,
  }), 30);
}

export async function sendDmPushNotification(
  recipientId: number,
  senderName: string,
  preview: string
): Promise<void> {
  ensureInitialized();
  if (!_initialized) return;
  const body = preview.length > 80 ? preview.slice(0, 77) + "…" : preview;
  await sendToUser(recipientId, JSON.stringify({
    type: "new_dm",
    senderName,
    title: senderName,
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "new-dm",
    url: "/messages",
  }), 86400);
}
