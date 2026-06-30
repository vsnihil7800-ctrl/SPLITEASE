import { createContext, useEffect, useState, useCallback, useRef } from "react";
import {
  getMyNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
  getVapidPublicKeyRequest,
  subscribePushRequest,
  unsubscribePushRequest,
} from "../api/notifications";
import { getSocket } from "../api/socket";
import { useAuth } from "./useAuth";

// eslint-disable-next-line react-refresh/only-export-components -- standard context+provider pattern
export const NotificationContext = createContext(null);

const TOKEN_KEY = "splitease_token";

// Converts a base64url VAPID public key string to a Uint8Array, which is
// what PushManager.subscribe({ applicationServerKey }) requires.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Checks if this browser supports Web Push. Requires ServiceWorker,
// PushManager, and the Notifications API — all three must be present.
function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Push state: "unsupported" | "denied" | "unsubscribed" | "subscribed" | "loading"
  const [pushStatus, setPushStatus] = useState(
    isPushSupported() ? "unsubscribed" : "unsupported"
  );

  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyNotificationsRequest();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Non-fatal — a failed fetch just means an empty bell for now.
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount (after user is set), check whether there's already an active
  // push subscription so the bell button shows the right state.
  const syncPushStatus = useCallback(async () => {
    if (!isPushSupported()) return;
    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      setPushStatus(existing ? "subscribed" : "unsubscribed");
    } catch {
      setPushStatus("unsubscribed");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      // Logged out (or not yet logged in) — nothing to show, nothing to listen for.
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    fetchNotifications();
    syncPushStatus();

    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    const handleNotification = (notification) => {
      setNotifications((prev) => {
        if (prev.some((n) => n._id === notification._id)) return prev;
        return [notification, ...prev];
      });
      setUnreadCount((prev) => prev + 1);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
    };
  }, [user, fetchNotifications, syncPushStatus]);

  // Subscribe this browser to Web Push.
  // Returns { ok: true } or { ok: false, reason: string }.
  const subscribePush = useCallback(async () => {
    if (!isPushSupported()) return { ok: false, reason: "unsupported" };

    if (Notification.permission === "denied") {
      setPushStatus("denied");
      return { ok: false, reason: "denied" };
    }

    setPushStatus("loading");
    try {
      // 1. Ask the browser for permission (no-op if already granted).
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushStatus("denied");
        return { ok: false, reason: "denied" };
      }

      // 2. Fetch the VAPID public key from our backend.
      const { data } = await getVapidPublicKeyRequest();
      const applicationServerKey = urlBase64ToUint8Array(data.vapidPublicKey);

      // 3. Subscribe via the Push API.
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      // 4. Send the subscription object to our backend.
      await subscribePushRequest(subscription.toJSON());

      setPushStatus("subscribed");
      return { ok: true };
    } catch (err) {
      console.error("subscribePush failed:", err);
      setPushStatus("unsubscribed");
      return { ok: false, reason: err.message };
    }
  }, []);

  // Unsubscribe this browser from Web Push.
  const unsubscribePush = useCallback(async () => {
    if (!isPushSupported()) return;
    setPushStatus("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePushRequest(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setPushStatus("unsubscribed");
    } catch (err) {
      console.error("unsubscribePush failed:", err);
      setPushStatus("subscribed"); // rollback assumption
    }
  }, []);

  const markRead = useCallback(async (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationReadRequest(id);
    } catch {
      // Non-critical
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsReadRequest();
    } catch {
      // Non-critical
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
    // Push
    pushStatus,     // "unsupported" | "denied" | "unsubscribed" | "subscribed" | "loading"
    subscribePush,
    unsubscribePush,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
