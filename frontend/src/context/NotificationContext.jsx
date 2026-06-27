import { createContext, useEffect, useState, useCallback, useRef } from "react";
import {
  getMyNotificationsRequest,
  markNotificationReadRequest,
  markAllNotificationsReadRequest,
} from "../api/notifications";
import { getSocket } from "../api/socket";
import { useAuth } from "./useAuth";

// eslint-disable-next-line react-refresh/only-export-components -- standard context+provider pattern
export const NotificationContext = createContext(null);

const TOKEN_KEY = "splitease_token";

// App-wide notification state, live for the whole session regardless of
// which page is open — unlike ChatPanel (which joins/leaves a specific
// group's room only while that page is mounted), notifications need to
// keep arriving everywhere, so this provider sits above the router in
// main.jsx/App.jsx rather than inside any one page.
//
// Reuses the SAME shared socket singleton as chat (api/socket.js's
// getSocket/disconnectSocket) — this provider only ever ADDS a
// "notification" listener to it and removes that one listener on
// cleanup; it never calls disconnectSocket() itself, since ChatPanel may
// also be using the same connection at the same time. Whoever unmounts
// last doesn't need to coordinate teardown — the socket is reused as long
// as any consumer wants it, and a stray idle connection after both
// unmount is a non-issue for this app's lifetime/scale.
export function NotificationProvider({ children }) {
  const { user } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMyNotificationsRequest();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Non-fatal — notifications are a convenience layer, not core
      // functionality. A failed fetch just means an empty bell for now;
      // the live socket listener below can still populate it going forward.
    } finally {
      setLoading(false);
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
  }, [user, fetchNotifications]);

  const markRead = useCallback(async (id) => {
    // Optimistic local update — the unread badge should feel instant.
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await markNotificationReadRequest(id);
    } catch {
      // If this fails, the next fetchNotifications() call (e.g. on next
      // login or manual refresh) will resync from the server's real
      // state — not worth rolling back the optimistic update for a
      // "mark read" action, which has no destructive consequence either way.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    try {
      await markAllNotificationsReadRequest();
    } catch {
      // Same reasoning as markRead — non-critical, self-heals on next fetch.
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    refresh: fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
