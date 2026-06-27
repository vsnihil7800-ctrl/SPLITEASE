import { useEffect, useState, useCallback } from "react";
import {
  getGroupSettlementsRequest,
  confirmSettlementRequest,
  rejectSettlementRequest,
} from "../api/settlements";
import { useAuth } from "../context/useAuth";

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Same row component/behavior BalancesPanel used to render inline inside
// its collapsible toggle — moved here verbatim (still the single
// confirm/reject UI for a settlement) now that Payment History has its
// own dedicated tab instead of being buried under a "Show history" link.
function SettlementHistoryRow({ settlement, currentUserId, onAction }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isPending = settlement.status === "pending";
  const isConfirmed = settlement.status === "confirmed";
  const isRejected = settlement.status === "rejected";

  const fromId = settlement.fromUser._id || settlement.fromUser.id;
  const toId = settlement.toUser._id || settlement.toUser.id;
  const isReceiver = toId === currentUserId;
  const isPayer = fromId === currentUserId;

  const handleConfirm = async () => {
    setLoading(true);
    setErr("");
    try {
      await confirmSettlementRequest(settlement._id);
      onAction();
    } catch (e) {
      setErr(e.response?.data?.message || "Couldn't confirm.");
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setErr("");
    try {
      await rejectSettlementRequest(settlement._id);
      onAction();
    } catch (e) {
      setErr(e.response?.data?.message || "Couldn't reject.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="text-sm">
        <span className="font-medium text-ink">{settlement.fromUser.name}</span>
        <span className="text-muted"> paid </span>
        <span className="font-medium text-ink">{settlement.toUser.name}</span>
        <span className="ml-2 text-xs text-muted">
          {isConfirmed && settlement.confirmedAt
            ? fmtDate(settlement.confirmedAt)
            : fmtDate(settlement.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="ledger-amount text-sm font-semibold text-ink">
          {fmtInr(settlement.amount)}
        </span>

        {/* Pending — receiver sees confirm/reject, payer sees waiting */}
        {isPending && isReceiver && (
          <>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="rounded-lg bg-success-soft px-2.5 py-1 text-xs font-medium text-success hover:opacity-80 disabled:opacity-50"
            >
              {loading ? "…" : "Confirm ✓"}
            </button>
            <button
              onClick={handleReject}
              disabled={loading}
              className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:opacity-80 disabled:opacity-50"
            >
              {loading ? "…" : "Reject ✗"}
            </button>
          </>
        )}
        {isPending && isPayer && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Awaiting confirmation
          </span>
        )}
        {isPending && !isReceiver && !isPayer && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
            Pending
          </span>
        )}

        {/* Confirmed */}
        {isConfirmed && (
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
            ✓ Confirmed
          </span>
        )}

        {/* Rejected */}
        {isRejected && (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
            ✗ Rejected
          </span>
        )}
      </div>

      {err && <p className="w-full text-xs text-danger">{err}</p>}
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "rejected", label: "Rejected" },
];

export default function PaymentHistoryPanel({ groupId }) {
  const { user } = useAuth();

  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getGroupSettlementsRequest(groupId);
      setSettlements(res.data.settlements);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load payment history.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  const filtered =
    filter === "all" ? settlements : settlements.filter((s) => s.status === filter);

  const pendingCount = settlements.filter((s) => s.status === "pending").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Payment history</h2>
          {settlements.length > 0 && (
            <p className="mt-0.5 text-xs text-muted">
              {settlements.length} payment{settlements.length === 1 ? "" : "s"} recorded
              {pendingCount > 0 && (
                <>
                  {" · "}
                  <span className="font-medium text-accent">{pendingCount} pending</span>
                </>
              )}
            </p>
          )}
        </div>

        {settlements.length > 0 && (
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-ink text-paper"
                    : "bg-paper-dim text-muted hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        {loading && <p className="text-sm text-muted">Loading payment history…</p>}

        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && settlements.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">
              No payments recorded yet. Once someone marks a balance as paid from the
              Balances tab, it'll show up here.
            </p>
          </div>
        )}

        {!loading && !error && settlements.length > 0 && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">No {filter} payments.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {filtered.map((s) => (
              <SettlementHistoryRow
                key={s._id}
                settlement={s}
                currentUserId={user?.id}
                onAction={fetchSettlements}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
