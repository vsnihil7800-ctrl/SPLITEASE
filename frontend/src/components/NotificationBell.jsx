import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../context/useNotifications";

function fmtRelativeTime(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

const TYPE_ICON = {
  settlement_created: "💰",
  settlement_confirmed: "✅",
  settlement_rejected: "⚠️",
};

function NotificationRow({ notification, onClick }) {
  return (
    <button
      onClick={() => onClick(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-paper-dim ${
        notification.read ? "" : "bg-accent-soft/40"
      }`}
    >
      <span className="text-base" aria-hidden="true">
        {TYPE_ICON[notification.type] || "🔔"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{notification.title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{notification.message}</p>
        <p className="mt-1 text-xs text-muted">{fmtRelativeTime(notification.createdAt)}</p>
      </div>
      {!notification.read && (
        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />
      )}
    </button>
  );
}

export default function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Close on outside click — standard dropdown behavior, no existing
  // pattern in this codebase to mirror (Modal.jsx is a full-screen overlay,
  // not a positioned dropdown), so this is a self-contained implementation.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleRowClick = (notification) => {
    if (!notification.read) markRead(notification._id);
    // Notifications that reference a group navigate there on click — the
    // group page's Payment History tab is where the underlying settlement
    // actually lives, so this is the natural destination.
    if (notification.groupId) {
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        title="Notifications"
        className="relative inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink-soft transition-colors hover:bg-paper-dim hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="ledger-amount absolute -right-1 -top-1 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 overflow-hidden rounded-2xl border border-hairline bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
            <h3 className="font-display text-sm font-semibold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-accent hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-center text-sm text-muted">Loading…</p>
            )}

            {!loading && notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted">
                No notifications yet.
              </p>
            )}

            {!loading &&
              notifications.length > 0 &&
              notifications.map((n) =>
                n.groupId ? (
                  <Link
                    key={n._id}
                    to={`/groups/${n.groupId}#payment-history`}
                    className="block"
                  >
                    <NotificationRow notification={n} onClick={handleRowClick} />
                  </Link>
                ) : (
                  <NotificationRow key={n._id} notification={n} onClick={handleRowClick} />
                )
              )}
          </div>
        </div>
      )}
    </div>
  );
}
