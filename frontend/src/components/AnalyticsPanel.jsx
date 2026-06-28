import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { getGroupAnalyticsRequest } from "../api/analytics";
import { useAuth } from "../context/useAuth";

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtPeriod(period) {
  const parts = period.split("-");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  if (parts.length === 2) {
    const [year, month] = parts;
    return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
  }
  const [year, month, day] = parts;
  return `${MONTHS[Number(month) - 1]} ${day}`;
}

// Maps current + legacy category names → colour + icon
const CATEGORY_META = {
  Food:          { color: "#e3992f", icon: "🍽️" },
  Travel:        { color: "#2f9e58", icon: "✈️" },
  Rent:          { color: "#7c9cbf", icon: "🏠" },
  Utilities:     { color: "#b07cc6", icon: "⚡" },
  Entertainment: { color: "#d6543f", icon: "🎬" },
  Other:         { color: "#6b7280", icon: "🧾" },
  // Legacy
  Electricity:   { color: "#b07cc6", icon: "⚡" },
  WiFi:          { color: "#6b7280", icon: "📶" },
  Groceries:     { color: "#e3992f", icon: "🛒" },
  Sports:        { color: "#2f9e58", icon: "🏏" },
  Misc:          { color: "#6b7280", icon: "🧾" },
};

function getCategoryColor(cat) {
  return CATEGORY_META[cat]?.color ?? "#6b7280";
}
function getCategoryIcon(cat) {
  return CATEGORY_META[cat]?.icon ?? "🧾";
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
      {label && <p className="mb-1 font-medium text-ink">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="ledger-amount text-ink-soft">
          {p.name}: {fmtInr(p.value)}
        </p>
      ))}
    </div>
  );
}

// Custom label for pie slices — only shown on slices >8 % to avoid overlap
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, category }) {
  if (percent < 0.08) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={13}>
      {getCategoryIcon(category)}
    </text>
  );
}

export default function AnalyticsPanel({ groupId }) {
  const { user } = useAuth();
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [granularity, setGranularity] = useState("month");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await getGroupAnalyticsRequest(groupId, granularity);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load analytics.");
    } finally { setLoading(false); }
  }, [groupId, granularity]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const isEmpty = data && data.expenseCount === 0 && data.billCount === 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Analytics</h2>
        <div className="flex rounded-lg border border-hairline bg-paper-dim p-1 text-xs font-medium">
          {["month", "day"].map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                granularity === g
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              by {g}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        {loading && <p className="text-sm text-muted">Loading analytics…</p>}

        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && isEmpty && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">
              No expenses or bills yet. Charts will show up here once the group starts tracking.
            </p>
          </div>
        )}

        {!loading && !error && data && !isEmpty && (
          <div className="space-y-6">

            {/* ── Summary strip ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Total spend</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">{fmtInr(data.totalSpend)}</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Expenses</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">{fmtInr(data.totalExpenses)}</p>
                <p className="text-xs text-muted">{data.expenseCount} logged</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Bills</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">{fmtInr(data.totalBills)}</p>
                <p className="text-xs text-muted">{data.billCount} tracked</p>
              </div>
            </div>

            {/* ── Spend over time ── */}
            {data.spendOverTime.length > 0 && (
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <h3 className="text-sm font-medium text-ink">Spend over time</h3>
                <div className="mt-3 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.spendOverTime.map((p) => ({ ...p, label: fmtPeriod(p.period) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-hairline)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--color-muted)" }} />
                      <YAxis tick={{ fontSize: 12, fill: "var(--color-muted)" }} width={48} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="expenses" name="Expenses" stackId="spend" fill="var(--color-accent)" radius={[0,0,0,0]} />
                      <Bar dataKey="bills"    name="Bills"    stackId="spend" fill="var(--color-ink)"    radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ── Category breakdown + member contributions ── */}
            <div className="grid gap-4 sm:grid-cols-2">

              {/* Category donut with icon labels */}
              {data.categoryBreakdown.length > 0 && (
                <div className="rounded-2xl border border-hairline bg-surface p-4">
                  <h3 className="text-sm font-medium text-ink">Spend by category</h3>

                  <div className="mt-3 h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={52}
                          outerRadius={84}
                          paddingAngle={2}
                          labelLine={false}
                          label={(props) => <PieLabel {...props} category={props.category} />}
                        >
                          {data.categoryBreakdown.map((entry) => (
                            <Cell
                              key={entry.category}
                              fill={getCategoryColor(entry.category)}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-hairline bg-surface px-3 py-2 text-xs shadow-sm">
                                <p className="font-medium text-ink">
                                  {getCategoryIcon(d.category)} {d.category}
                                </p>
                                <p className="ledger-amount text-ink-soft">{fmtInr(d.amount)}</p>
                                <p className="text-muted">{d.count} item{d.count !== 1 ? "s" : ""}</p>
                              </div>
                            );
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Legend rows */}
                  <ul className="mt-1 space-y-2">
                    {data.categoryBreakdown.map((c) => {
                      const pct = data.totalSpend > 0
                        ? Math.round((c.amount / data.totalSpend) * 100)
                        : 0;
                      return (
                        <li key={c.category} className="flex items-center gap-2 text-xs">
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-sm"
                            style={{ backgroundColor: getCategoryColor(c.category) + "22" }}
                          >
                            {getCategoryIcon(c.category)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-ink-soft">{c.category}</span>
                          <span className="ledger-amount font-medium text-ink">{fmtInr(c.amount)}</span>
                          <span
                            className="w-8 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-medium"
                            style={{
                              backgroundColor: getCategoryColor(c.category) + "22",
                              color: getCategoryColor(c.category),
                            }}
                          >
                            {pct}%
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Member contributions */}
              {data.memberContributions.length > 0 && (
                <div className="rounded-2xl border border-hairline bg-surface p-4">
                  <h3 className="text-sm font-medium text-ink">Who's fronted the most</h3>
                  <p className="mt-0.5 text-xs text-muted">
                    Total amount each member has paid for expenses (before splitting back).
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {data.memberContributions.map((m) => {
                      const max = data.memberContributions[0]?.amount || 1;
                      const pct = max > 0 ? Math.round((m.amount / max) * 100) : 0;
                      const isMe = m.user.id === user?.id;
                      return (
                        <li key={m.user.id}>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-ink">
                              {m.user.name}{isMe && <span className="text-muted"> (you)</span>}
                            </span>
                            <span className="ledger-amount text-ink-soft">{fmtInr(m.amount)}</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-dim">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
