export const CATEGORY_META = {
  Food:          { icon: "🍽️",  color: "#e3992f" },
  Travel:        { icon: "✈️",  color: "#2f9e58" },
  Rent:          { icon: "🏠",  color: "#7c9cbf" },
  Utilities:     { icon: "⚡",  color: "#b07cc6" },
  Entertainment: { icon: "🎬",  color: "#d6543f" },
  Other:         { icon: "🧾",  color: "#6b7280" },
  // Legacy aliases
  Electricity:   { icon: "⚡",  color: "#b07cc6" },
  WiFi:          { icon: "📶",  color: "#6b7280" },
  Groceries:     { icon: "🛒",  color: "#e3992f" },
  Sports:        { icon: "🏏",  color: "#2f9e58" },
  Misc:          { icon: "🧾",  color: "#6b7280" },
};

export default function ExpenseRow({ expense, currentUserId, onDelete, deleting }) {
  const canDelete = expense.paidBy?._id === currentUserId;
  const iPaid = expense.paidBy?._id === currentUserId;
  const meta = CATEGORY_META[expense.category] || CATEGORY_META.Other;

  const formattedAmount = expense.amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedDate = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-3.5 ${
      iPaid ? "border-l-2 border-success" : "border-l-2 border-danger"
    }`}>
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base"
          style={{ backgroundColor: meta.color + "22" }}
          aria-hidden="true"
        >
          {meta.icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{expense.title}</p>
          <p className="text-xs text-muted">
            <span
              className="mr-1.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: meta.color + "22", color: meta.color }}
            >
              {expense.category || "Other"}
            </span>
            Paid by {expense.paidBy?.name || "Unknown"} · {formattedDate} ·{" "}
            {expense.splitType === "equal" ? "Equal" : "Custom"} ÷ {expense.splits.length}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <div className="text-right">
          <span className={`ledger-amount text-sm font-semibold ${iPaid ? "text-success" : "text-danger"}`}>
            ₹{formattedAmount}
          </span>
          <p className={`text-[10px] font-medium ${iPaid ? "text-success" : "text-danger"}`}>
            {iPaid ? "You paid" : "You owe"}
          </p>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(expense._id)}
            disabled={deleting}
            className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
          >
            {deleting ? "…" : "Delete"}
          </button>
        )}
      </div>
    </div>
  );
}
