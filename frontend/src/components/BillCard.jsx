import { useState } from "react";

const CATEGORY_ICONS = {
  Rent: "🏠", Electricity: "⚡", WiFi: "📶", Water: "🚿",
  Maid: "🧹", Groceries: "🛒", Misc: "🧾",
  Food: "🍽️", Travel: "✈️", Utilities: "⚡", Entertainment: "🎬", Other: "🧾",
};

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MemberShareRow({ member, billId, currentUserId, isCreator, onMarkPaid }) {
  const [marking, setMarking] = useState(false);
  const isMe = member.userId?._id === currentUserId;
  const canMark = member.status === "pending" && (isMe || isCreator);
  const isPaid = member.status === "paid";

  const handleMark = async () => {
    setMarking(true);
    try { await onMarkPaid(billId, member.userId._id); }
    finally { setMarking(false); }
  };

  return (
    <div className={`flex items-center justify-between gap-3 py-1.5 ${
      isMe ? (isPaid ? "border-l-2 border-success pl-2" : "border-l-2 border-danger pl-2") : ""
    }`}>
      <span className={`text-sm ${isMe ? "font-medium text-ink" : "text-ink-soft"}`}>
        {isMe ? `${member.userId?.name} (you)` : member.userId?.name || "Unknown"}
      </span>
      <div className="flex items-center gap-2">
        <span className={`ledger-amount text-sm ${isMe ? (isPaid ? "text-success" : "text-danger") : "text-ink-soft"}`}>
          {fmtInr(member.amount)}
        </span>
        {isPaid ? (
          <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success">Paid ✓</span>
        ) : canMark ? (
          <button
            onClick={handleMark}
            disabled={marking}
            className="rounded-md bg-success-soft px-2 py-0.5 text-xs font-medium text-success transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {marking ? "…" : "Mark paid"}
          </button>
        ) : (
          <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-medium text-danger">Pending</span>
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
  const formattedDate = dueDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const paidCount = bill.members.filter((m) => m.status === "paid").length;

  const myShare = bill.members.find((m) => m.userId?._id === currentUserId);
  const iMePaid = myShare?.status === "paid";

  return (
    <div className={`px-5 py-4 ${myShare ? (iMePaid ? "border-l-2 border-success" : "border-l-2 border-danger") : ""}`}>
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
              {myShare && (
                <span className={`ml-1.5 font-medium ${iMePaid ? "text-success" : "text-danger"}`}>
                  · {iMePaid ? "You paid" : "You owe"}
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className={`ledger-amount text-sm font-semibold ${
            myShare ? (iMePaid ? "text-success" : "text-danger") : "text-ink"
          }`}>
            {fmtInr(bill.amount)}
          </span>
          {isOverdue && !iMePaid && (
            <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-medium text-danger">Overdue</span>
          )}
          {iMePaid && (
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">Paid ✓</span>
          )}
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
