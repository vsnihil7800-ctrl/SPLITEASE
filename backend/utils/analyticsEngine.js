/**
 * analyticsEngine.js
 *
 * Pure-logic exports (no DB, no Express dependency):
 *
 *   normaliseCategory(cat)  — maps legacy categories to current set
 *   buildCategoryBreakdown(expenses, bills)
 *   buildSpendOverTime(expenses, bills, granularity)
 *   buildMemberContributions(expenses, memberMap)
 *   round2(n)
 */

const round2 = (n) => {
  const sign = n < 0 ? -1 : 1;
  return sign * Math.round((Math.abs(n) + Number.EPSILON) * 100) / 100;
};

const periodKey = (date, granularity) => {
  const d = new Date(date);
  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  if (granularity === "day") {
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return `${year}-${month}`;
};

// Map old category names → new canonical set
const CATEGORY_ALIAS = {
  Electricity: "Utilities",
  WiFi:        "Utilities",
  Groceries:   "Food",
  Sports:      "Entertainment",
  Misc:        "Other",
};

const normaliseCategory = (cat) => CATEGORY_ALIAS[cat] || cat || "Other";

const buildCategoryBreakdown = (expenses = [], bills = []) => {
  const totals = new Map();

  for (const e of expenses) {
    const cat   = normaliseCategory(e.category);
    const entry = totals.get(cat) || { amount: 0, count: 0 };
    entry.amount = round2(entry.amount + e.amount);
    entry.count += 1;
    totals.set(cat, entry);
  }

  for (const b of bills) {
    const cat   = normaliseCategory(b.category);
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
  const buckets = new Map();

  for (const e of expenses) {
    const key   = periodKey(e.date || e.createdAt, granularity);
    const entry = buckets.get(key) || { expenses: 0, bills: 0 };
    entry.expenses = round2(entry.expenses + e.amount);
    buckets.set(key, entry);
  }

  for (const b of bills) {
    const key   = periodKey(b.createdAt, granularity);
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
  const totals = new Map();

  for (const e of expenses) {
    const payerId = (e.paidBy?._id || e.paidBy)?.toString();
    if (!payerId) continue;
    totals.set(payerId, round2((totals.get(payerId) || 0) + e.amount));
  }

  for (const id of memberMap.keys()) {
    if (!totals.has(id)) totals.set(id, 0);
  }

  return Array.from(totals.entries())
    .map(([id, amount]) => ({
      user: { id, ...(memberMap.get(id) || { name: "Unknown", email: "", upiId: null }) },
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
};

module.exports = {
  round2,
  periodKey,
  normaliseCategory,
  buildCategoryBreakdown,
  buildSpendOverTime,
  buildMemberContributions,
};
