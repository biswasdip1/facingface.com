import { useState, useEffect } from "react";
import { Bell, BellOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { pushNotificationManager } from "@/_core/pushNotifications";

type NotificationType =
  | "follow"
  | "friend_request"
  | "live_stream"
  | "post_like"
  | "post_comment"
  | "direct_message"
  | "admin_broadcast"
  | "mention"
  | "reshare"
  | "group_invite"
  | "incoming_call"
  | "story";

interface NotificationPreference {
  type: NotificationType;
  label: string;
  description: string;
  enabled: boolean;
}

export function NotificationSettings() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[]>([
    {
      type: "follow",
      label: "New Followers",
      description: "When someone follows you",
      enabled: true,
    },
    {
      type: "friend_request",
      label: "Friend Requests",
      description: "When someone sends you a friend request",
      enabled: true,
    },
    {
      type: "live_stream",
      label: "Live Streams",
      description: "When people you follow go live",
      enabled: true,
    },
    {
      type: "post_like",
      label: "Post Likes",
      description: "When someone likes your post",
      enabled: true,
    },
    {
      type: "post_comment",
      label: "Post Comments",
      description: "When someone comments on your post",
      enabled: true,
    },
    {
      type: "direct_message",
      label: "Direct Messages",
      description: "When you receive a new message",
      enabled: true,
    },
    {
      type: "mention",
      label: "Mentions",
      description: "When someone mentions you in a post",
      enabled: true,
    },
    {
      type: "reshare",
      label: "Post Reshares",
      description: "When someone reshares your post",
      enabled: true,
    },
    {
      type: "group_invite",
      label: "Group Invitations",
      description: "When someone invites you to a group",
      enabled: true,
    },
    {
      type: "incoming_call",
      label: "Incoming Calls",
      description: "When someone calls you",
      enabled: true,
    },
    {
      type: "story",
      label: "New Stories",
      description: "When people you follow post stories",
      enabled: true,
    },
    {
      type: "admin_broadcast",
      label: "Admin Announcements",
      description: "Important announcements from administrators",
      enabled: true,
    },
  ]);

  useEffect(() => {
    setIsSupported(pushNotificationManager.isNotificationSupported());
    setPermission(pushNotificationManager.getPermissionStatus());
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/notifications/preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences((prev) =>
          prev.map((pref) => ({
            ...pref,
            enabled: data[pref.type] !== false,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    }
  };

  const handleEnableNotifications = async () => {
    const result = await pushNotificationManager.initialize();
    if (result) {
      setPermission("granted");
      setIsSubscribed(true);
    }
  };

  const handleDisableNotifications = async () => {
    await pushNotificationManager.unsubscribe();
    setIsSubscribed(false);
  };

  const handlePreferenceChange = async (type: NotificationType, enabled: boolean) => {
    setPreferences((prev) =>
      prev.map((pref) => (pref.type === type ? { ...pref, enabled } : pref))
    );

    try {
      await fetch("/api/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          enabled,
        }),
      });
    } catch (error) {
      console.error("Failed to save notification preference:", error);
    }
  };

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-900">Push Notifications Not Supported</h3>
            <p className="mt-1 text-sm text-amber-800">
              Your browser doesn't support push notifications. Please use a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main notification toggle */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Push Notifications</h3>
            <p className="mt-1 text-sm text-slate-600">
              {permission === "granted"
                ? "You're receiving push notifications"
                : "Enable push notifications to stay updated"}
            </p>
          </div>
          <button
            onClick={permission === "granted" ? handleDisableNotifications : handleEnableNotifications}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
              permission === "granted"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            {permission === "granted" ? (
              <>
                <BellOff size={18} />
                Disable
              </>
            ) : (
              <>
                <Bell size={18} />
                Enable
              </>
            )}
          </button>
        </div>

        {permission === "granted" && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3">
            <CheckCircle2 size={18} className="text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Notifications are active on this device
            </span>
          </div>
        )}
      </div>

      {/* Notification type preferences */}
      {permission === "granted" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Notification Types</h3>
          <div className="space-y-3">
            {preferences.map((pref) => (
              <label
                key={pref.type}
                className="flex items-start gap-3 rounded-lg p-3 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  onChange={(e) => handlePreferenceChange(pref.type, e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                />
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{pref.label}</p>
                  <p className="text-sm text-slate-600">{pref.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> You can manage notification permissions in your browser settings at any time.
          Disabling notifications here won't affect your account, just your notification preferences.
        </p>
      </div>
    </div>
  );
}
