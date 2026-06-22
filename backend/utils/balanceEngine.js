/**
 * balanceEngine.js
 *
 * Two pure-logic exports:
 *
 *   computeNetBalances(expenses)
 *     Takes a list of populated Expense documents and returns a Map of
 *     userId (string) → net amount (Number, positive = is owed money,
 *     negative = owes money).  Values are rounded to 2 decimal places.
 *
 *   simplifyDebts(netMap, memberMap)
 *     Takes the net Map above and a Map of userId → { name, email, upiId },
 *     and returns the minimal set of transactions that settles all debts
 *     using a greedy two-pointer algorithm on sorted creditors/debtors.
 *     Returns an array of { from, to, amount } objects where from/to are
 *     { id, name, email, upiId } shapes.
 *
 * Both functions are pure (no DB, no side effects) so they can be unit-tested
 * and fuzz-tested directly without Express or Mongoose running.
 */

const EPSILON = 0.005; // half a paisa — treat anything smaller as zero

/**
 * Round to 2 decimal places using the "round half away from zero" rule
 * (same strategy as buildEqualSplits in expenseController).
 */
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * computeNetBalances
 *
 * For each expense:
 *   - The payer is credited the full amount  (+amount)
 *   - Each participant in expense.splits is debited their share (-split.amount)
 *
 * Note: the payer's own share is included in splits (they owe themselves that
 * portion, which nets to zero for that slice), so the net for a payer who
 * splits equally among N people is: +total - total/N = total*(N-1)/N — exactly
 * what they should recover from others.
 */
function computeNetBalances(expenses) {
  const net = new Map(); // userId string → running net

  const credit = (userId, amount) => {
    const key = userId.toString();
    net.set(key, round2((net.get(key) || 0) + amount));
  };

  const debit = (userId, amount) => {
    const key = userId.toString();
    net.set(key, round2((net.get(key) || 0) - amount));
  };

  for (const expense of expenses) {
    const payerId = expense.paidBy._id
      ? expense.paidBy._id.toString()
      : expense.paidBy.toString();

    // Payer is owed the full expense amount by the group
    credit(payerId, expense.amount);

    // Every split participant owes their share
    for (const split of expense.splits) {
      const participantId = split.userId._id
        ? split.userId._id.toString()
        : split.userId.toString();
      debit(participantId, split.amount);
    }
  }

  return net;
}

/**
 * simplifyDebts
 *
 * Greedy two-pointer algorithm:
 *   1. Separate net Map into creditors (net > 0) and debtors (net < 0).
 *   2. Sort both descending by absolute value.
 *   3. While both lists are non-empty, match the largest creditor with the
 *      largest debtor:
 *        - If debtor owes more than creditor is owed → creditor is fully
 *          settled, debtor still owes the remainder (stays in list).
 *        - If creditor is owed more than debtor owes → debtor is fully
 *          settled, creditor is still partially owed (stays in list).
 *        - If equal → both are fully settled.
 *
 * This always produces ≤ N-1 transactions for N participants (optimal for
 * the common case; provably minimal for most real-world expense graphs).
 *
 * @param {Map<string, number>} netMap   userId → net balance
 * @param {Map<string, object>} memberMap userId → { name, email, upiId }
 * @returns {Array<{ from: object, to: object, amount: number }>}
 */
function simplifyDebts(netMap, memberMap) {
  // Build mutable creditor/debtor lists, filtering out near-zero balances
  const creditors = []; // { id, amount }  (amount > 0)
  const debtors = [];   // { id, amount }  (amount > 0, represents what they owe)

  for (const [id, net] of netMap.entries()) {
    if (net > EPSILON) creditors.push({ id, amount: net });
    else if (net < -EPSILON) debtors.push({ id, amount: -net });
    // near-zero → already settled, skip
  }

  // Sort descending by amount so we always match the largest values first
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transactions = [];

  let ci = 0; // creditor pointer
  let di = 0; // debtor pointer

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const transferAmount = round2(Math.min(creditor.amount, debtor.amount));

    if (transferAmount > EPSILON) {
      transactions.push({
        from: buildUserShape(debtor.id, memberMap),
        to: buildUserShape(creditor.id, memberMap),
        amount: transferAmount,
      });
    }

    creditor.amount = round2(creditor.amount - transferAmount);
    debtor.amount = round2(debtor.amount - transferAmount);

    if (creditor.amount <= EPSILON) ci++;
    if (debtor.amount <= EPSILON) di++;
  }

  return transactions;
}

function buildUserShape(id, memberMap) {
  const member = memberMap.get(id) || {};
  return {
    id,
    name: member.name || "Unknown",
    email: member.email || "",
    upiId: member.upiId || null,
  };
}

module.exports = { computeNetBalances, simplifyDebts, round2, EPSILON };
