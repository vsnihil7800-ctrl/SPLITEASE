import { useEffect, useState, useCallback } from "react";
import {
  getGroupBalancesRequest,
  createSettlementRequest,
  getGroupSettlementsRequest,
  confirmSettlementRequest,
  rejectSettlementRequest,
} from "../api/settlements";
import { useAuth } from "../context/useAuth";

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

function fmtDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
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
    setLoading(true); setErr("");
    try { await confirmSettlementRequest(settlement._id); onAction(); }
    catch (e) { setErr(e.response?.data?.message || "Couldn't confirm."); setLoading(false); }
  };

  const handleReject = async () => {
    setLoading(true); setErr("");
    try { await rejectSettlementRequest(settlement._id); onAction(); }
    catch (e) { setErr(e.response?.data?.message || "Couldn't reject."); setLoading(false); }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
      <div className="text-sm">
        <span className="font-medium text-ink">{settlement.fromUser.name}</span>
        <span className="text-muted"> paid </span>
        <span className="font-medium text-ink">{settlement.toUser.name}</span>
        <span className="ml-2 text-xs text-muted">
          {isConfirmed && settlement.confirmedAt ? fmtDate(settlement.confirmedAt) : fmtDate(settlement.createdAt)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="ledger-amount text-sm font-semibold text-ink">{fmtInr(settlement.amount)}</span>

        {/* Pending — receiver sees confirm/reject, payer sees waiting */}
        {isPending && isReceiver && (
          <>
            <button onClick={handleConfirm} disabled={loading}
              className="rounded-lg bg-success-soft px-2.5 py-1 text-xs font-medium text-success hover:opacity-80 disabled:opacity-50">
              {loading ? "…" : "Confirm ✓"}
            </button>
            <button onClick={handleReject} disabled={loading}
              className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger hover:opacity-80 disabled:opacity-50">
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
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">Pending</span>
        )}

        {/* Confirmed */}
        {isConfirmed && (
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">✓ Confirmed</span>
        )}

        {/* Rejected */}
        {isRejected && (
          <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">✗ Rejected</span>
        )}
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
  const [settlementsLoading, setSettlementsLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

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
    setSettlementsLoading(true);
    try {
      const res = await getGroupSettlementsRequest(groupId);
      setSettlements(res.data.settlements);
    } catch { } finally { setSettlementsLoading(false); }
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
              <SettlementHistoryRow key={s._id} settlement={s} currentUserId={user?.id} onAction={handleAction} />
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
          {/* ── Per-member net balances ── */}
          <div className="rounded-2xl border border-hairline bg-surface">
            <div className="divide-y divide-hairline">
              {netBalances.map(({ user: u, net }) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-ink">{u.id === user?.id ? `${u.name} (you)` : u.name}</p>
                    {net > 0.005 && <p className="text-xs text-muted">is owed money</p>}
                    {net < -0.005 && <p className="text-xs text-muted">owes money</p>}
                  </div>
                  <NetBadge net={net} />
                </div>
              ))}
            </div>
          </div>

          {/* ── Suggested payments ── */}
          {suggestedPayments.length > 0 && (
            <div>
              <h3 className="mb-3 font-display text-base font-semibold text-ink">Suggested payments</h3>
              <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                {suggestedPayments.map((payment, i) => (
                  <PaymentRow key={i} payment={payment} groupId={groupId} currentUserId={user?.id} onSettled={handleAction} />
                ))}
              </div>
            </div>
          )}

          {suggestedPayments.length === 0 && (
            <div className="rounded-2xl border border-hairline bg-success-soft p-5 text-center">
              <p className="text-sm font-medium text-success">✓ Everyone is settled up!</p>
            </div>
          )}

          {/* ── Settlement history ── */}
          {settlements.length > 0 && (
            <div>
              <button onClick={() => setShowHistory((v) => !v)} className="text-sm font-medium text-accent hover:underline">
                {showHistory ? "Hide" : "Show"} payment history ({settlements.length})
              </button>
              {showHistory && (
                <div className="mt-3 divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                  {settlementsLoading ? (
                    <p className="px-5 py-4 text-sm text-muted">Loading…</p>
                  ) : (
                    settlements.map((s) => (
                      <SettlementHistoryRow key={s._id} settlement={s} currentUserId={user?.id} onAction={handleAction} />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
