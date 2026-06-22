const CATEGORY_ICONS = {
  Rent: "🏠",
  Electricity: "⚡",
  Food: "🍽️",
  Travel: "🚕",
  WiFi: "📶",
  Groceries: "🛒",
  Sports: "🏏",
  Misc: "🧾",
};

export default function ExpenseRow({ expense, currentUserId, onDelete, deleting }) {
  const canDelete = expense.paidBy?._id === currentUserId;
  const formattedAmount = expense.amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const formattedDate = new Date(expense.date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-lg" aria-hidden="true">
          {CATEGORY_ICONS[expense.category] || CATEGORY_ICONS.Misc}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{expense.title}</p>
          <p className="text-xs text-muted">
            Paid by {expense.paidBy?.name || "Unknown"} · {formattedDate} ·{" "}
            {expense.splitType === "equal" ? "Split equally" : "Custom split"} among{" "}
            {expense.splits.length}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="ledger-amount text-sm font-semibold text-ink">
          ₹{formattedAmount}
        </span>
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
