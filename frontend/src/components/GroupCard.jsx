import { Link } from "react-router-dom";

const TYPE_BADGE_STYLES = {
  Stay: "bg-accent-soft text-accent",
  Trip: "bg-success-soft text-success",
  "Sports Team": "bg-danger-soft text-danger",
  General: "bg-paper-dim text-ink-soft",
};

function fmtNet(net) {
  if (net === undefined || net === null) return "—";
  if (Math.abs(net) < 0.005) return "Settled up";
  const sign = net > 0 ? "+" : "";
  return sign + "₹" + Math.abs(net).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GroupCard({ group, myNet }) {
  const badgeStyle = TYPE_BADGE_STYLES[group.groupType] || TYPE_BADGE_STYLES.General;
  const memberCount = group.members?.length || 0;

  return (
    <Link
      to={`/groups/${group._id}`}
      className="block rounded-2xl border border-hairline bg-surface p-5 transition-shadow hover:shadow-[0_12px_32px_-16px_rgba(22,36,61,0.18)]"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink">{group.name}</h3>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badgeStyle}`}>
          {group.groupType}
        </span>
      </div>

      {group.description && (
        <p className="mt-1.5 line-clamp-2 text-sm text-muted">{group.description}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs text-muted">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
        <span
          className={
            "ledger-amount text-sm " +
            (myNet === undefined || myNet === null
              ? "text-muted"
              : Math.abs(myNet) < 0.005
              ? "text-muted"
              : myNet > 0
              ? "text-success"
              : "text-danger")
          }
        >
          {fmtNet(myNet)}
        </span>
      </div>
    </Link>
  );
}
