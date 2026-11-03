// Service Worker for FacingFace Push Notifications
// This file handles push notifications in the background

self.addEventListener("push", (event) => {
  if (!event.data) {
    console.log("[SW] Push received but no data");
    return;
  }

  try {
    const data = event.data.json();
    const { type, title, body, icon, badge, tag, url, actions, requireInteraction } = data;

    const options = {
      body: body || "",
      icon: icon || "/favicon.ico",
      badge: badge || "/favicon.ico",
      tag: tag || "notification",
      requireInteraction: requireInteraction || false,
      actions: actions || [
        { action: "open", title: "Open" },
        { action: "close", title: "Close" }
      ],
      data: { url: url || "/" },
      vibrate: [100, 50, 100],
    };

    event.waitUntil(
      self.registration.showNotification(title || "FacingFace", options)
    );
  } catch (error) {
    console.error("[SW] Error processing push notification:", error);
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const action = event.action;
  const url = event.notification.data?.url || "/";

  // Handle different actions
  if (action === "close" || action === "decline") {
    return;
  }

  // Navigate to the appropriate URL based on action
  let targetUrl = url;

  if (action === "accept") {
    // For friend requests, group invites, etc.
    targetUrl = url; // The URL should already be set correctly
  } else if (action === "watch") {
    targetUrl = "/live";
  } else if (action === "reply") {
    targetUrl = url;
  } else if (action === "open_chat") {
    targetUrl = "/messages";
  } else if (action === "view_profile") {
    targetUrl = url;
  } else if (action === "view_post") {
    targetUrl = url;
  } else if (action === "view_story") {
    targetUrl = "/stories";
  } else if (action === "view_broadcast") {
    targetUrl = "/broadcasts";
  }

  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      // Check if FacingFace is already open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === "/" || client.url.includes("facingface.com")) {
          // Focus existing window and navigate
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // If not open, open a new window
      return clients.openWindow(targetUrl);
    })
  );
});

// Handle notification close
self.addEventListener("notificationclose", (event) => {
  console.log("[SW] Notification closed:", event.notification.tag);
});

// Background sync for offline notifications
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-notifications") {
    event.waitUntil(
      fetch("/api/notifications/sync")
        .then((response) => response.json())
        .catch((error) => {
          console.error("[SW] Sync failed:", error);
        })
    );
  }
});
