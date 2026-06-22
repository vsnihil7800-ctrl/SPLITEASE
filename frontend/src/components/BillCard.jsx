import { useState } from "react";

const CATEGORY_ICONS = {
  Rent: "🏠",
  Electricity: "⚡",
  WiFi: "📶",
  Water: "🚿",
  Maid: "🧹",
  Groceries: "🛒",
  Misc: "🧾",
};

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status, isOverdue }) {
  if (status === "paid") {
    return (
      <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
        Paid ✓
      </span>
    );
  }
  if (isOverdue) {
    return (
      <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">
        Overdue
      </span>
    );
  }
  if (status === "partially paid") {
    return (
      <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
        Partially paid
      </span>
    );
  }
  return (
    <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
      Pending
    </span>
  );
}

function MemberShareRow({ member, billId, currentUserId, isCreator, onMarkPaid }) {
  const [marking, setMarking] = useState(false);
  const isMe = member.userId?._id === currentUserId;
  const canMark = member.status === "pending" && (isMe || isCreator);

  const handleMark = async () => {
    setMarking(true);
    try {
      await onMarkPaid(billId, member.userId._id);
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-ink">
        {isMe ? `${member.userId?.name} (you)` : member.userId?.name || "Unknown"}
      </span>
      <div className="flex items-center gap-2">
        <span className="ledger-amount text-sm text-ink-soft">{fmtInr(member.amount)}</span>
        {member.status === "paid" ? (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
            Paid
          </span>
        ) : canMark ? (
          <button
            onClick={handleMark}
            disabled={marking}
            className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {marking ? "…" : "Mark paid"}
          </button>
        ) : (
          <span className="rounded-full bg-paper-dim px-2 py-0.5 text-xs font-medium text-muted">
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

export default function BillCard({ bill, currentUserId, onMarkPaid, onDelete, deleting }) {
  const [expanded, setExpanded] = useState(false);

  const isCreator = bill.createdBy?._id === currentUserId;
  const dueDate = new Date(bill.dueDate);
  const isOverdue = bill.status !== "paid" && dueDate.getTime() < Date.now();
  const formattedDate = dueDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const paidCount = bill.members.filter((m) => m.status === "paid").length;

  return (
    <div className="px-5 py-4">
      <div
        className="flex cursor-pointer items-center justify-between gap-4"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-lg" aria-hidden="true">
            {CATEGORY_ICONS[bill.category] || CATEGORY_ICONS.Misc}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{bill.title}</p>
            <p className="text-xs text-muted">
              Due {formattedDate} · {paidCount}/{bill.members.length} paid
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="ledger-amount text-sm font-semibold text-ink">
            {fmtInr(bill.amount)}
          </span>
          <StatusBadge status={bill.status} isOverdue={isOverdue} />
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border border-hairline bg-paper p-3">
          <div className="divide-y divide-hairline/60">
            {bill.members.map((m) => (
              <MemberShareRow
                key={m.userId?._id || m._id}
                member={m}
                billId={bill._id}
                currentUserId={currentUserId}
                isCreator={isCreator}
                onMarkPaid={onMarkPaid}
              />
            ))}
          </div>

          {isCreator && (
            <div className="mt-3 flex justify-end border-t border-hairline pt-3">
              <button
                onClick={() => onDelete(bill._id)}
                disabled={deleting}
                className="text-xs font-medium text-danger hover:underline disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete bill"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
