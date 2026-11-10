/**
 * Client-side Push Notification Manager
 * Handles service worker registration, subscription, and notification permissions
 */

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationManager {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private isSupported = false;

  constructor() {
    this.isSupported =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
  }

  /**
   * Initialize push notifications
   * - Register service worker
   * - Request notification permission
   * - Subscribe to push notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log("[Push] Push notifications not supported in this browser");
      return false;
    }

    try {
      // Register service worker
      this.serviceWorkerRegistration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" }
      );
      console.log("[Push] Service Worker registered successfully");

      // Request notification permission if not already granted
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("[Push] Notification permission denied");
          return false;
        }
      }

      if (Notification.permission !== "granted") {
        console.log("[Push] Notification permission not granted");
        return false;
      }

      // Subscribe to push notifications
      await this.subscribe();
      return true;
    } catch (error) {
      console.error("[Push] Failed to initialize push notifications:", error);
      return false;
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      console.log("[Push] Service Worker not registered");
      return false;
    }

    try {
      // Check if already subscribed
      const existingSubscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (existingSubscription) {
        console.log("[Push] Already subscribed to push notifications");
        // Send subscription to server
        await this.sendSubscriptionToServer(existingSubscription);
        return true;
      }

      // Get VAPID public key from server
      const vapidPublicKey = await this.getVapidPublicKey();
      if (!vapidPublicKey) {
        console.log("[Push] VAPID public key not available");
        return false;
      }

      // Subscribe to push notifications
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log("[Push] Successfully subscribed to push notifications");

      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      return true;
    } catch (error) {
      console.error("[Push] Failed to subscribe to push notifications:", error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe(): Promise<boolean> {
    if (!this.serviceWorkerRegistration) {
      return false;
    }

    try {
      const subscription =
        await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        // Notify server about unsubscription
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
        console.log("[Push] Successfully unsubscribed from push notifications");
        return true;
      }
    } catch (error) {
      console.error("[Push] Failed to unsubscribe:", error);
    }
    return false;
  }

  /**
   * Check if push notifications are supported
   */
  isNotificationSupported(): boolean {
    return this.isSupported;
  }

  /**
   * Get current notification permission status
   */
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported) return "denied";
    return Notification.permission;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return "denied";
    return await Notification.requestPermission();
  }

  /**
   * Send subscription to server
   */
  private async sendSubscriptionToServer(
    subscription: PushSubscription
  ): Promise<void> {
    try {
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: this.arrayBufferToBase64(
              subscription.getKey("p256dh") as ArrayBuffer
            ),
            auth: this.arrayBufferToBase64(
              subscription.getKey("auth") as ArrayBuffer
            ),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      console.log("[Push] Subscription sent to server");
    } catch (error) {
      console.error("[Push] Failed to send subscription to server:", error);
    }
  }

  /**
   * Get VAPID public key from server
   */
  private async getVapidPublicKey(): Promise<string | null> {
    try {
      const response = await fetch("/api/push/vapid-public-key");
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }
      const data = await response.json();
      return data.vapidPublicKey;
    } catch (error) {
      console.error("[Push] Failed to get VAPID public key:", error);
      return null;
    }
  }

  /**
   * Convert URL-safe Base64 to Uint8Array
   */
  private urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Convert ArrayBuffer to Base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Auto-initialize on page load if user is logged in
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    // Check if user is logged in by checking for auth token
    const hasAuthToken = localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (hasAuthToken) {
      pushNotificationManager.initialize().catch(console.error);
    }
  });
}
