import { useEffect, useState, useCallback } from "react";
import {
  getGroupBalancesRequest,
  createSettlementRequest,
  getGroupSettlementsRequest,
  confirmSettlementRequest,
  rejectSettlementRequest,
} from "../api/settlements";
import { useAuth } from "../context/useAuth";
import TabBar from "./TabBar";

function buildUpiLink({ upiId, name, amount, note }) {
  if (!upiId) return null;
  const params = new URLSearchParams({
    pa: upiId, pn: name, am: amount.toFixed(2), cu: "INR",
    tn: note || "SplitEase Stay settlement",
  });
  return `upi://pay?${params.toString()}`;
}

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function NetBadge({ net }) {
  if (Math.abs(net) < 0.005) {
    return <span className="ledger-amount rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-muted">Settled up</span>;
  }
  const isPositive = net > 0;
  return (
    <span className={`ledger-amount rounded-full px-2.5 py-1 text-xs font-medium ${isPositive ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
      {isPositive ? "+" : ""}{fmtInr(net)}
    </span>
  );
}

function PaymentRow({ payment, groupId, currentUserId, onSettled }) {
  const [recording, setRecording] = useState(false);
  const [err, setErr] = useState("");

  const isFromMe = payment.from.id === currentUserId;
  const upiLink = isFromMe ? buildUpiLink({ upiId: payment.to.upiId, name: payment.to.name, amount: payment.amount, note: "SplitEase Stay" }) : null;

  const handleRecord = async () => {
    setRecording(true);
    setErr("");
    try {
      await createSettlementRequest({ groupId, fromUser: payment.from.id, toUser: payment.to.id, amount: payment.amount });
      onSettled();
    } catch (e) {
      setErr(e.response?.data?.message || "Couldn't record payment.");
      setRecording(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-ink">{payment.from.name}</span>
        <span className="text-muted">→</span>
        <span className="font-medium text-ink">{payment.to.name}</span>
        {payment.to.upiId && <span className="text-xs text-muted">({payment.to.upiId})</span>}
      </div>
      <div className="flex items-center gap-2">
        <span className="ledger-amount text-sm font-semibold text-danger">{fmtInr(payment.amount)}</span>
        {isFromMe && upiLink && (
          <a href={upiLink} className="rounded-lg bg-success-soft px-3 py-1.5 text-xs font-medium text-success transition-opacity hover:opacity-80">
            Pay via UPI
          </a>
        )}
        {isFromMe && (
          <button onClick={handleRecord} disabled={recording}
            className="rounded-lg bg-accent-soft px-3 py-1.5 text-xs font-medium text-accent transition-opacity hover:opacity-80 disabled:opacity-50">
            {recording ? "Sending…" : "I paid"}
          </button>
        )}
        {!isFromMe && (
          <span className="text-xs text-muted italic">Waiting for them to pay</span>
        )}
      </div>
      {err && <p className="w-full text-xs text-danger">{err}</p>}
    </div>
  );
}

// Lightweight standalone confirm/reject row for the "action required"
// banner — intentionally simpler than the full history row (no date, no
// payer-side "awaiting confirmation" branch) since every row here is, by
// definition, already filtered to "pending AND I'm the receiver" — the
// only state this banner ever shows.
function PendingConfirmationRow({ settlement, onAction }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
        <span className="text-muted"> says they paid you </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="ledger-amount text-sm font-semibold text-ink">{fmtInr(settlement.amount)}</span>
        <button onClick={handleConfirm} disabled={loading}
          className="rounded-lg bg-success-soft px-2.5 py-1 text-xs font-medium text-success hover:opacity-80 disabled:opacity-50">
          {loading ? "…" : "Confirm ✓"}
        </button>
        <button onClick={handleReject} disabled={loading}
          className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:opacity-80 disabled:opacity-50">
          {loading ? "…" : "Reject ✗"}
        </button>
      </div>
      {err && <p className="w-full text-xs text-danger">{err}</p>}
    </div>
  );
}

export default function BalancesPanel({ groupId }) {
  const { user } = useAuth();

  const [balancesData, setBalancesData] = useState(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [balancesError, setBalancesError] = useState("");
  const [settlements, setSettlements] = useState([]);
  const [direction, setDirection] = useState("owe"); // "owe" | "owed" — which sub-tab is active

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true); setBalancesError("");
    try {
      const res = await getGroupBalancesRequest(groupId);
      setBalancesData(res.data);
    } catch (e) {
      setBalancesError(e.response?.data?.message || "Couldn't load balances.");
    } finally { setBalancesLoading(false); }
  }, [groupId]);

  const fetchSettlements = useCallback(async () => {
    try {
      const res = await getGroupSettlementsRequest(groupId);
      setSettlements(res.data.settlements);
    } catch {
      // Non-fatal — this just feeds the "action required" banner and the
      // pointer link below; Payment History (its own tab) has its own
      // independent fetch + error handling for the real list.
    }
  }, [groupId]);

  useEffect(() => {
    fetchBalances();
    fetchSettlements();
  }, [fetchBalances, fetchSettlements]);

  const handleAction = () => { fetchBalances(); fetchSettlements(); };

  // Pending settlements where current user is receiver — show at top as action items
  const pendingForMe = settlements.filter((s) => {
    const toId = s.toUser._id || s.toUser.id;
    return s.status === "pending" && toId === user?.id;
  });

  if (balancesLoading) return <p className="text-sm text-muted">Loading balances…</p>;
  if (balancesError) return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{balancesError}</p>;

  const { netBalances = [], suggestedPayments = [], totalExpenses = 0 } = balancesData || {};
  const hasActivity = totalExpenses > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Balances</h2>
          {hasActivity && (
            <p className="mt-0.5 text-xs text-muted">
              Total group spend: <span className="ledger-amount font-medium text-ink">{fmtInr(totalExpenses)}</span>
            </p>
          )}
        </div>
      </div>

      {/* ── Action required banner ── */}
      {pendingForMe.length > 0 && (
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-4">
          <p className="text-sm font-semibold text-accent mb-3">
            🔔 {pendingForMe.length} payment{pendingForMe.length > 1 ? "s" : ""} waiting for your confirmation
          </p>
          <div className="divide-y divide-hairline rounded-xl border border-hairline bg-surface">
            {pendingForMe.map((s) => (
              <PendingConfirmationRow key={s._id} settlement={s} onAction={handleAction} />
            ))}
          </div>
        </div>
      )}

      {!hasActivity ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
          <p className="text-sm text-muted">No expenses yet — balances will appear once the group starts tracking expenses.</p>
        </div>
      ) : (
        <>
          {/* ── You Owe / You're Owed sub-tabs ── */}
          {(() => {
            // Only rows where the logged-in person is actually a party —
            // in a 3+ person group, simplifyDebts can suggest a payment
            // between two OTHER members that doesn't involve you at all.
            // Those aren't "your" balance, so they're deliberately left
            // out of both tabs here rather than cluttering either list.
            const youOwe = suggestedPayments.filter((p) => p.from.id === user?.id);
            const owedToYou = suggestedPayments.filter((p) => p.to.id === user?.id);
            const visible = direction === "owe" ? youOwe : owedToYou;

            return (
              <div>
                <TabBar
                  tabs={[
                    { id: "owe", label: `You Owe${youOwe.length ? ` (${youOwe.length})` : ""}` },
                    { id: "owed", label: `You're Owed${owedToYou.length ? ` (${owedToYou.length})` : ""}` },
                  ]}
                  active={direction}
                  onChange={setDirection}
                />

                <div className="mt-3">
                  {visible.length > 0 ? (
                    <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                      {visible.map((payment, i) => (
                        <PaymentRow key={i} payment={payment} groupId={groupId} currentUserId={user?.id} onSettled={handleAction} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-hairline bg-success-soft p-5 text-center">
                      <p className="text-sm font-medium text-success">
                        {direction === "owe" ? "✓ You don't owe anyone right now." : "✓ No one owes you right now."}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
