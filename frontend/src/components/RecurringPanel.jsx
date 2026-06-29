import { useEffect, useState, useCallback } from "react";
import { getGroupRecurringRequest, createRecurringRequest, deleteRecurringRequest } from "../api/recurring";
import { useAuth } from "../context/useAuth";
import Modal from "./Modal";
import Button from "./Button";
import Input from "./Input";

const CATEGORIES = [
  { value: "Food", icon: "🍽️" }, { value: "Travel", icon: "✈️" },
  { value: "Rent", icon: "🏠" }, { value: "Utilities", icon: "⚡" },
  { value: "Entertainment", icon: "🎬" }, { value: "Other", icon: "🧾" },
];

function fmtInr(n) {
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function RecurringPanel({ groupId, members, currentUserId }) {
  const [recurrings, setRecurrings] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showAdd, setShowAdd]       = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Form state
  const [title, setTitle]         = useState("");
  const [amount, setAmount]       = useState("");
  const [category, setCategory]   = useState("Other");
  const [frequency, setFrequency] = useState("monthly");
  const [paidBy, setPaidBy]       = useState(currentUserId);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");

  const fetch = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getGroupRecurringRequest(groupId);
      setRecurrings(res.data.recurrings);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load recurring expenses.");
    } finally { setLoading(false); }
  }, [groupId]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setFormError(""); setSubmitting(true);
    try {
      await createRecurringRequest({ groupId, title, amount: Number(amount), paidBy, category, frequency });
      setShowAdd(false); setTitle(""); setAmount(""); setCategory("Other"); setFrequency("monthly");
      await fetch();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't create recurring expense.");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try { await deleteRecurringRequest(id); await fetch(); }
    catch (e) { setError(e.response?.data?.message || "Couldn't remove."); }
    finally { setDeletingId(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Recurring Expenses</h2>
        <Button variant="accent" onClick={() => setShowAdd(true)}>+ Add</Button>
      </div>

      <p className="mt-1 text-xs text-muted">Weekly or monthly expenses that repeat automatically.</p>

      <div className="mt-3">
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}
        {!loading && !error && recurrings.length === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">No recurring expenses yet.</p>
          </div>
        )}
        {!loading && recurrings.length > 0 && (
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
            {recurrings.map((r) => {
              const catMeta = CATEGORIES.find((c) => c.value === r.category) || { icon: "🧾" };
              const isOwner = r.paidBy?._id === currentUserId;
              return (
                <div key={r._id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-xl">{catMeta.icon}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{r.title}</p>
                      <p className="text-xs text-muted">
                        {r.paidBy?.name} · {r.frequency} · Next: {fmtDate(r.nextDue)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="ledger-amount text-sm font-semibold text-ink">{fmtInr(r.amount)}</span>
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent capitalize">
                      {r.frequency}
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(r._id)}
                        disabled={deletingId === r._id}
                        className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
                      >
                        {deletingId === r._id ? "…" : "Remove"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add recurring expense">
        <form onSubmit={handleAdd} className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly Rent" required />
          <Input label="Amount (₹)" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Category</span>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
                    category === c.value ? "border-accent bg-accent-soft text-ink" : "border-hairline text-muted hover:bg-paper-dim"
                  }`}>
                  <span className="text-xl">{c.icon}</span>{c.value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Frequency</span>
            <div className="flex gap-2">
              {["weekly", "monthly"].map((f) => (
                <button key={f} type="button" onClick={() => setFrequency(f)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                    frequency === f ? "border-accent bg-accent-soft text-ink" : "border-hairline text-muted hover:bg-paper-dim"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Paid by</span>
            <select value={paidBy} onChange={(e) => setPaidBy(e.target.value)}
              className="w-full rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-accent">
              {members.map((m) => (
                <option key={m._id} value={m._id}>{m._id === currentUserId ? `${m.name} (you)` : m.name}</option>
              ))}
            </select>
          </label>

          {formError && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{formError}</p>}

          <Button type="submit" variant="accent" className="w-full justify-center py-2.5" disabled={submitting || !title || !amount}>
            {submitting ? "Adding…" : "Add recurring expense"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
