import { useEffect, useState, useCallback } from "react";
import { getGroupActivityRequest } from "../api/activity";
import { useAuth } from "../context/useAuth";

const TYPE_META = {
  expense_created:      { icon: "🧾", color: "#e3992f", label: "added expense" },
  expense_deleted:      { icon: "🗑️", color: "#d6543f", label: "deleted expense" },
  bill_created:         { icon: "📄", color: "#7c9cbf", label: "added bill" },
  bill_paid:            { icon: "✅", color: "#2f9e58", label: "marked bill paid" },
  settlement_created:   { icon: "💸", color: "#b07cc6", label: "recorded payment" },
  settlement_confirmed: { icon: "✓",  color: "#2f9e58", label: "confirmed payment" },
  settlement_rejected:  { icon: "✗",  color: "#d6543f", label: "rejected payment" },
  member_joined:        { icon: "👋", color: "#6b7280", label: "joined the group" },
};

function fmtInr(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function ActivityItem({ activity, currentUserId }) {
  const meta = TYPE_META[activity.type] || { icon: "•", color: "#6b7280", label: activity.type };
  const isMe = activity.actor?._id === currentUserId;
  const actorName = isMe ? "You" : (activity.actor?.name || "Someone");

  let detail = "";
  const m = activity.meta || {};
  if (m.title && m.amount) detail = `"${m.title}" · ${fmtInr(m.amount)}`;
  else if (m.fromName && m.toName && m.amount) detail = `${m.fromName} → ${m.toName} · ${fmtInr(m.amount)}`;
  else if (m.title) detail = `"${m.title}"`;
  else if (m.frequency) detail = `${m.frequency}`;

  return (
    <div className="flex items-start gap-3 px-5 py-3">
      <span
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
        style={{ backgroundColor: meta.color + "22" }}
      >
        {meta.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink">
          <span className="font-medium">{actorName}</span>{" "}
          <span className="text-ink-soft">{meta.label}</span>
          {detail && (
            <span className="ml-1 text-muted">· {detail}</span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-muted">{timeAgo(activity.createdAt)}</p>
      </div>
    </div>
  );
}

export default function ActivityFeed({ groupId }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getGroupActivityRequest(groupId);
      setActivities(res.data.activities);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load activity.");
    } finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Activity</h2>
        <button onClick={fetch} className="text-xs text-accent hover:underline">Refresh</button>
      </div>

      <div className="mt-3">
        {loading && <p className="text-sm text-muted">Loading activity…</p>}
        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {!loading && !error && activities.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">No activity yet. Add an expense to get started.</p>
          </div>
        )}
        {!loading && !error && activities.length > 0 && (
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {activities.map((a) => (
              <ActivityItem key={a._id} activity={a} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
