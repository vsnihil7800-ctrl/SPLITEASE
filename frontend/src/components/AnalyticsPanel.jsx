import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { getGroupAnalyticsRequest } from "../api/analytics";
import { useAuth } from "../context/useAuth";

function fmtInr(amount) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Format a "YYYY-MM" or "YYYY-MM-DD" period key into a short display label
function fmtPeriod(period) {
  const parts = period.split("-");
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  if (parts.length === 2) {
    const [year, month] = parts;
    return `${MONTHS[Number(month) - 1]} '${year.slice(2)}`;
  }
  const [year, month, day] = parts;
  return `${MONTHS[Number(month) - 1]} ${day}`;
}

// Category colors pulled from the existing design tokens where possible,
// plus a few extra hues so all 8 expense/bill categories stay distinguishable.
const CATEGORY_COLORS = [
  "#e3992f", // accent
  "#2f9e58", // success
  "#d6543f", // danger
  "#16243d", // ink
  "#6b7280", // muted
  "#7c9cbf",
  "#b07cc6",
  "#c9a227",
];

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

export default function AnalyticsPanel({ groupId }) {
  const { user } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [granularity, setGranularity] = useState("month");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getGroupAnalyticsRequest(groupId, granularity);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't load analytics.");
    } finally {
      setLoading(false);
    }
  }, [groupId, granularity]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

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

        {!loading && !error && data && data.expenseCount === 0 && data.billCount === 0 && (
          <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
            <p className="text-sm text-muted">
              No expenses or bills yet. Once the group starts tracking spend,
              charts will show up here.
            </p>
          </div>
        )}

        {!loading && !error && data && (data.expenseCount > 0 || data.billCount > 0) && (
          <div className="space-y-6">
            {/* Summary strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Total spend</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">
                  {fmtInr(data.totalSpend)}
                </p>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Expenses</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">
                  {fmtInr(data.totalExpenses)}
                </p>
                <p className="text-xs text-muted">{data.expenseCount} logged</p>
              </div>
              <div className="rounded-2xl border border-hairline bg-surface p-4">
                <p className="text-xs text-muted">Bills</p>
                <p className="ledger-amount mt-1 text-xl font-semibold text-ink">
                  {fmtInr(data.totalBills)}
                </p>
                <p className="text-xs text-muted">{data.billCount} tracked</p>
              </div>
            </div>

            {/* Spend over time */}
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
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="expenses" name="Expenses" stackId="spend" fill="var(--color-accent)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="bills" name="Bills" stackId="spend" fill="var(--color-ink)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category breakdown + member contributions side by side */}
            <div className="grid gap-4 sm:grid-cols-2">
              {data.categoryBreakdown.length > 0 && (
                <div className="rounded-2xl border border-hairline bg-surface p-4">
                  <h3 className="text-sm font-medium text-ink">By category</h3>
                  <div className="mt-3 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          dataKey="amount"
                          nameKey="category"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {data.categoryBreakdown.map((entry, idx) => (
                            <Cell
                              key={entry.category}
                              fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {data.categoryBreakdown.map((c, idx) => (
                      <li
                        key={c.category}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2 text-ink-soft">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                            }}
                          />
                          {c.category}
                        </span>
                        <span className="ledger-amount text-ink">
                          {fmtInr(c.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.memberContributions.length > 0 && (
                <div className="rounded-2xl border border-hairline bg-surface p-4">
                  <h3 className="text-sm font-medium text-ink">
                    Who's fronted the most
                  </h3>
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
                              {m.user.name}
                              {isMe && (
                                <span className="text-muted"> (you)</span>
                              )}
                            </span>
                            <span className="ledger-amount text-ink-soft">
                              {fmtInr(m.amount)}
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-paper-dim">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
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
