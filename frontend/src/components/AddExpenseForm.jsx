import { useState, useMemo } from "react";
import Input from "./Input";
import Button from "./Button";

const CATEGORIES = [
  { value: "Food",          icon: "🍽️",  label: "Food" },
  { value: "Travel",        icon: "✈️",  label: "Travel" },
  { value: "Rent",          icon: "🏠",  label: "Rent" },
  { value: "Utilities",     icon: "⚡",  label: "Utilities" },
  { value: "Entertainment", icon: "🎬",  label: "Entertainment" },
  { value: "Other",         icon: "🧾",  label: "Other" },
];

export default function AddExpenseForm({ members, currentUserId, onCreate, submitting, error }) {
  const [title, setTitle]         = useState("");
  const [amount, setAmount]       = useState("");
  const [category, setCategory]   = useState("Other");
  const [paidBy, setPaidBy]       = useState(currentUserId);
  const [splitType, setSplitType] = useState("equal");

  const [participantIds, setParticipantIds] = useState(members.map((m) => m._id));
  const [customAmounts, setCustomAmounts]   = useState(
    Object.fromEntries(members.map((m) => [m._id, ""]))
  );

  const numericAmount = Number(amount) || 0;

  const toggleParticipant = (id) => {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const customTotal = useMemo(
    () => Object.values(customAmounts).reduce((sum, v) => sum + (Number(v) || 0), 0),
    [customAmounts]
  );
  const customRemainder = Math.round((numericAmount - customTotal) * 100) / 100;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { title, amount: numericAmount, paidBy, category, splitType };
    if (splitType === "equal") {
      payload.splits = participantIds.map((userId) => ({ userId }));
    } else {
      payload.splits = Object.entries(customAmounts)
        .filter(([, v]) => Number(v) > 0)
        .map(([userId, v]) => ({ userId, amount: Number(v) }));
    }
    onCreate(payload);
  };

  const equalSplitInvalid  = splitType === "equal"  && participantIds.length === 0;
  const customSplitInvalid = splitType === "custom" && Math.abs(customRemainder) >= 0.01;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="What's it for?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. Groceries for the week"
        required
      />

      <Input
        label="Amount (₹)"
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="0.00"
        className="ledger-amount"
        required
      />

      {/* Category pill selector */}
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Category</span>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${
                category === c.value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-hairline text-muted hover:bg-paper-dim"
              }`}
            >
              <span className="text-xl">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Paid by</span>
        <select
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full rounded-lg border border-hairline bg-surface px-3.5 py-2.5 text-ink outline-none focus:border-accent"
        >
          {members.map((m) => (
            <option key={m._id} value={m._id}>
              {m._id === currentUserId ? `${m.name} (you)` : m.name}
            </option>
          ))}
        </select>
      </label>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Split</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSplitType("equal")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              splitType === "equal"
                ? "border-accent bg-accent-soft text-ink"
                : "border-hairline text-muted hover:bg-paper-dim"
            }`}
          >
            Equal
          </button>
          <button
            type="button"
            onClick={() => setSplitType("custom")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
              splitType === "custom"
                ? "border-accent bg-accent-soft text-ink"
                : "border-hairline text-muted hover:bg-paper-dim"
            }`}
          >
            Custom
          </button>
        </div>
      </div>

      {splitType === "equal" && (
        <div className="rounded-lg border border-hairline bg-paper p-3">
          <p className="mb-2 text-xs text-muted">Split equally among:</p>
          <div className="space-y-1.5">
            {members.map((m) => (
              <label key={m._id} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={participantIds.includes(m._id)}
                  onChange={() => toggleParticipant(m._id)}
                  className="accent-accent"
                />
                {m._id === currentUserId ? `${m.name} (you)` : m.name}
              </label>
            ))}
          </div>
          {equalSplitInvalid && (
            <p className="mt-2 text-xs text-danger">Select at least one person.</p>
          )}
        </div>
      )}

      {splitType === "custom" && (
        <div className="rounded-lg border border-hairline bg-paper p-3">
          <p className="mb-2 text-xs text-muted">Enter each person's share:</p>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m._id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-ink">
                  {m._id === currentUserId ? `${m.name} (you)` : m.name}
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={customAmounts[m._id]}
                  onChange={(e) =>
                    setCustomAmounts((prev) => ({ ...prev, [m._id]: e.target.value }))
                  }
                  placeholder="0.00"
                  className="ledger-amount w-24 rounded-md border border-hairline bg-surface px-2 py-1 text-right text-sm outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between border-t border-hairline pt-2 text-xs">
            <span className="text-muted">Remaining to allocate</span>
            <span className={`ledger-amount font-medium ${customSplitInvalid ? "text-danger" : "text-success"}`}>
              ₹{customRemainder.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <Button
        type="submit"
        variant="accent"
        className="w-full justify-center py-2.5"
        disabled={submitting || equalSplitInvalid || customSplitInvalid || !title || numericAmount <= 0}
      >
        {submitting ? "Adding…" : "Add expense"}
      </Button>
    </form>
  );
}
