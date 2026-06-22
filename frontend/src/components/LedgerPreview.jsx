const entries = [
  { name: "Rent — July", amount: 24000, status: "due", note: "Due 5 Jul · 4 members" },
  { name: "Ajith paid you", amount: 6000, status: "paid", note: "via UPI · today" },
  { name: "Groceries split", amount: -850, status: "owe", note: "you owe Rishi" },
];

function StatusPill({ status }) {
  const map = {
    due: { text: "Pending", cls: "bg-accent-soft text-accent" },
    paid: { text: "Settled", cls: "bg-success-soft text-success" },
    owe: { text: "You owe", cls: "bg-danger-soft text-danger" },
  };
  const s = map[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.text}
    </span>
  );
}

export default function LedgerPreview() {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface shadow-[0_1px_0_rgba(0,0,0,0.02),0_12px_32px_-12px_rgba(22,36,61,0.18)]">
      <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Group passbook</p>
          <p className="font-display text-base font-semibold text-ink">Hostel 4B</p>
        </div>
        <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-soft">
          4 members
        </span>
      </div>

      <ul>
        {entries.map((entry, i) => (
          <li
            key={entry.name}
            className={`flex items-center justify-between px-5 py-4 ${
              i !== entries.length - 1 ? "border-b border-hairline/70" : ""
            }`}
          >
            <div>
              <p className="text-sm font-medium text-ink">{entry.name}</p>
              <p className="text-xs text-muted">{entry.note}</p>
            </div>
            <div className="text-right">
              <p
                className={`ledger-amount text-sm font-medium ${
                  entry.amount < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {entry.amount < 0 ? "−" : "₹"}
                {Math.abs(entry.amount).toLocaleString("en-IN")}
              </p>
              <div className="mt-1">
                <StatusPill status={entry.status} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between px-5 py-4">
        <p className="text-xs text-muted">Net this month</p>
        <p className="ledger-amount text-sm font-semibold text-success">+₹5,150</p>
      </div>
    </div>
  );
}
