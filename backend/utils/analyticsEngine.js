/**
 * analyticsEngine.js
 *
 * Pure-logic exports (no DB, no Express dependency — fully unit/fuzz
 * testable in isolation, same philosophy as balanceEngine.js):
 *
 *   buildCategoryBreakdown(expenses, bills)
 *     Takes populated Expense + Bill docs, returns an array of
 *     { category, amount, count } sorted by amount descending, combining
 *     spend from both collections under a shared category label.
 *
 *   buildSpendOverTime(expenses, bills, granularity)
 *     Buckets expense.date / bill.createdAt into calendar months (or days)
 *     and returns a chronologically-sorted array of
 *     { period, expenses, bills, total } so the frontend can chart total
 *     group spend over time without doing any date math itself.
 *
 *   buildMemberContributions(expenses, memberMap)
 *     Takes populated Expense docs and a Map<userId, {name,email,upiId}>,
 *     returns each member's total amount *paid* (fronted) across all
 *     expenses — i.e. "who's actually been putting money down" — sorted
 *     descending. Distinct from net balance (which nets out what they owe
 *     back); this is gross contribution.
 *
 *   round2(n) — shared rounding utility, "round half away from zero",
 *     same strategy as balanceEngine.js / expenseController's buildEqualSplits.
 */

const round2 = (n) => {
  const sign = n < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
};

// Format a Date into a "YYYY-MM" (month) or "YYYY-MM-DD" (day) bucket key,
// using UTC to keep bucketing deterministic regardless of server timezone.
const periodKey = (date, granularity) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  if (granularity === "day") {
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}`;
};

const buildCategoryBreakdown = (expenses = [], bills = []) => {
  const totals = new Map(); // category -> { amount, count }

  for (const e of expenses) {
    const cat = e.category || "Misc";
    const entry = totals.get(cat) || { amount: 0, count: 0 };
    entry.amount = round2(entry.amount + e.amount);
    entry.count += 1;
    totals.set(cat, entry);
  }

  for (const b of bills) {
    const cat = b.category || "Misc";
    const entry = totals.get(cat) || { amount: 0, count: 0 };
    entry.amount = round2(entry.amount + b.amount);
    entry.count += 1;
    totals.set(cat, entry);
  }

  return Array.from(totals.entries())
    .map(([category, { amount, count }]) => ({ category, amount, count }))
    .sort((a, b) => b.amount - a.amount);
};

const buildSpendOverTime = (expenses = [], bills = [], granularity = "month") => {
  const buckets = new Map(); // period -> { expenses, bills }

  for (const e of expenses) {
    const key = periodKey(e.date || e.createdAt, granularity);
    const entry = buckets.get(key) || { expenses: 0, bills: 0 };
    entry.expenses = round2(entry.expenses + e.amount);
    buckets.set(key, entry);
  }

  for (const b of bills) {
    // Bills don't have a single "spend date" in the same sense as expenses —
    // use createdAt (when the bill was added to the tracker), not dueDate
    // (which can be in the future and would skew "spend over time" charts).
    const key = periodKey(b.createdAt, granularity);
    const entry = buckets.get(key) || { expenses: 0, bills: 0 };
    entry.bills = round2(entry.bills + b.amount);
    buckets.set(key, entry);
  }

  return Array.from(buckets.entries())
    .map(([period, { expenses: exp, bills: bil }]) => ({
      period,
      expenses: exp,
      bills: bil,
      total: round2(exp + bil),
    }))
    .sort((a, b) => (a.period < b.period ? -1 : a.period > b.period ? 1 : 0));
};

const buildMemberContributions = (expenses = [], memberMap = new Map()) => {
  const totals = new Map(); // userId -> amount paid

  for (const e of expenses) {
    const payerId = (e.paidBy?._id || e.paidBy)?.toString();
    if (!payerId) continue;
    totals.set(payerId, round2((totals.get(payerId) || 0) + e.amount));
  }

  // Ensure every known member appears, even with zero contributions —
  // mirrors getGroupBalances' "every member appears even with no expenses".
  for (const id of memberMap.keys()) {
    if (!totals.has(id)) totals.set(id, 0);
  }

  return Array.from(totals.entries())
    .map(([id, amount]) => ({
      user: {
        id,
        ...(memberMap.get(id) || { name: "Unknown", email: "", upiId: null }),
      },
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
};

module.exports = {
  round2,
  periodKey,
  buildCategoryBreakdown,
  buildSpendOverTime,
  buildMemberContributions,
};
