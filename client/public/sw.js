/* FacingFace Service Worker — handles Web Push notifications */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "FacingFace", body: event.data.text() };
  }

  const title = data.title || "FacingFace";
  const options = {
    body: data.body || "",
    icon: data.icon || "/favicon.ico",
    badge: data.badge || "/favicon.ico",
    tag: data.tag || "facingface",
    requireInteraction: data.requireInteraction ?? false,
    data: data,
    actions:
      data.type === "incoming_call"
        ? [
            { action: "accept", title: "Accept" },
            { action: "decline", title: "Decline" },
          ]
        : data.type === "new_dm"
        ? [{ action: "open", title: "Open Messages" }]
        : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};

  if (event.action === "decline") {
    // Just close — the call will time out on the caller's side
    return;
  }

  // Determine target URL based on notification type
  let urlToOpen;
  if (data.type === "new_dm" || event.action === "open") {
    urlToOpen = self.registration.scope + "messages";
  } else {
    // incoming_call accept or default click → open calls page
    urlToOpen = self.registration.scope + "calls";
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.registration.scope) && "focus" in client) {
            client.focus();
            if ("navigate" in client) {
              client.navigate(urlToOpen);
            }
            return;
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});
