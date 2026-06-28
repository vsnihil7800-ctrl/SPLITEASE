import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getGroupByIdRequest } from "../api/groups";
import { getExpensesByGroupRequest, createExpenseRequest, deleteExpenseRequest } from "../api/expenses";
import { disconnectSocket } from "../api/socket";
import { useAuth } from "../context/useAuth";
import Logo from "../components/Logo";
import Button from "../components/Button";
import Modal from "../components/Modal";
import TabBar from "../components/TabBar";
import ExpenseRow, { CATEGORY_META } from "../components/ExpenseRow";
import AddExpenseForm from "../components/AddExpenseForm";
import BillsPanel from "../components/BillsPanel";
import BalancesPanel from "../components/BalancesPanel";
import PaymentHistoryPanel from "../components/PaymentHistoryPanel";
import AnalyticsPanel from "../components/AnalyticsPanel";
import ChatPanel from "../components/ChatPanel";
import ThemeToggle from "../components/ThemeToggle";
import NotificationBell from "../components/NotificationBell";

const TABS = [
  { id: "members",  label: "Members" },
  { id: "expenses", label: "Expenses" },
  { id: "balance",  label: "Balance" },
  { id: "analytics",label: "Analytics" },
  { id: "chat",     label: "Chat" },
];

const ALL_CATEGORIES = ["Food", "Travel", "Rent", "Utilities", "Entertainment", "Other"];

export default function GroupDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [group, setGroup]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [copied, setCopied] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    const requested = searchParams.get("tab");
    return TABS.some((t) => t.id === requested) ? requested : "members";
  });

  const [expenses, setExpenses]               = useState([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [expensesError, setExpensesError]     = useState("");
  const [deletingId, setDeletingId]           = useState(null);
  const [categoryFilter, setCategoryFilter]   = useState("All");

  const [showAddExpense, setShowAddExpense]   = useState(false);
  const [formSubmitting, setFormSubmitting]   = useState(false);
  const [formError, setFormError]             = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      setLoading(true); setError("");
      try {
        const res = await getGroupByIdRequest(id);
        setGroup(res.data.group);
      } catch (err) {
        setError(err.response?.data?.message || "Couldn't load this group.");
      } finally { setLoading(false); }
    };
    fetchGroup();
  }, [id]);

  useEffect(() => { return () => disconnectSocket(); }, []);

  useEffect(() => {
    const fetchExpenses = async () => {
      setExpensesLoading(true); setExpensesError("");
      try {
        const res = await getExpensesByGroupRequest(id);
        setExpenses(res.data.expenses);
      } catch (err) {
        setExpensesError(err.response?.data?.message || "Couldn't load expenses.");
      } finally { setExpensesLoading(false); }
    };
    fetchExpenses();
  }, [id]);

  const refreshExpenses = async () => {
    try {
      const res = await getExpensesByGroupRequest(id);
      setExpenses(res.data.expenses);
    } catch (err) {
      setExpensesError(err.response?.data?.message || "Couldn't load expenses.");
    }
  };

  const handleCopyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const handleAddExpense = async (payload) => {
    setFormError(""); setFormSubmitting(true);
    try {
      await createExpenseRequest({ ...payload, groupId: id });
      setShowAddExpense(false);
      await refreshExpenses();
    } catch (err) {
      setFormError(err.response?.data?.message || "Couldn't add the expense.");
    } finally { setFormSubmitting(false); }
  };

  const handleDeleteExpense = async (expenseId) => {
    setDeletingId(expenseId);
    try {
      await deleteExpenseRequest(expenseId);
      await refreshExpenses();
    } catch (err) {
      setExpensesError(err.response?.data?.message || "Couldn't delete the expense.");
    } finally { setDeletingId(null); }
  };

  // Normalise legacy category names to current set
  const normalise = (cat) => {
    const map = { Electricity: "Utilities", WiFi: "Utilities", Groceries: "Food", Sports: "Entertainment", Misc: "Other" };
    return map[cat] || cat || "Other";
  };

  // Derived: which categories actually exist in this group's expenses
  const presentCategories = [...new Set(expenses.map((e) => normalise(e.category)))];
  const filterOptions = ["All", ...ALL_CATEGORIES.filter((c) => presentCategories.includes(c))];

  const filteredExpenses =
    categoryFilter === "All"
      ? expenses
      : expenses.filter((e) => normalise(e.category) === categoryFilter);

  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <NotificationBell />
          <Link to="/dashboard" className="text-sm font-medium text-ink-soft hover:text-accent">
            ← Back to groups
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading && <p className="text-sm text-muted">Loading group…</p>}

        {!loading && error && (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>
        )}

        {!loading && !error && group && (
          <>
            <div className="rounded-2xl border border-hairline bg-surface p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-ink">{group.name}</h1>
                  {group.description && (
                    <p className="mt-1 text-sm text-muted">{group.description}</p>
                  )}
                  <span className="mt-2 inline-block rounded-full bg-paper-dim px-2.5 py-1 text-xs font-medium text-ink-soft">
                    {group.groupType}
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-hairline bg-paper px-2.5 py-1.5 text-xs text-muted hover:text-ink"
                >
                  <span className="font-mono font-semibold tracking-widest text-ink">{group.inviteCode}</span>
                  <span className="text-accent">{copied ? "✓" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="mt-6">
              <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />
            </div>

            {/* ── Members ── */}
            {activeTab === "members" && (
              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-ink">
                  Members ({group.members.length})
                </h2>
                <div className="mt-3 divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                  {group.members.map((member) => (
                    <div key={member._id} className="flex items-center justify-between px-5 py-3.5">
                      <div>
                        <p className="text-sm font-medium text-ink">{member.name}</p>
                        <p className="text-xs text-muted">{member.email}</p>
                      </div>
                      {member.upiId && (
                        <span className="text-xs text-muted">UPI: {member.upiId}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Expenses ── */}
            {activeTab === "expenses" && (
              <div className="mt-6 space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold text-ink">Expenses</h2>
                    <Button
                      variant="accent"
                      onClick={() => { setFormError(""); setShowAddExpense(true); }}
                    >
                      + Add expense
                    </Button>
                  </div>

                  {/* Category filter pills */}
                  {filterOptions.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {filterOptions.map((cat) => {
                        const meta = CATEGORY_META[cat];
                        return (
                          <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                              categoryFilter === cat
                                ? "bg-ink text-paper"
                                : "bg-paper-dim text-muted hover:text-ink"
                            }`}
                          >
                            {meta && <span>{meta.icon}</span>}
                            {cat}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3">
                    {expensesLoading && <p className="text-sm text-muted">Loading expenses…</p>}

                    {!expensesLoading && expensesError && (
                      <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                        {expensesError}
                      </p>
                    )}

                    {!expensesLoading && !expensesError && expenses.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
                        <p className="text-sm text-muted">
                          No expenses yet. Add the first one to start tracking who owes what.
                        </p>
                      </div>
                    )}

                    {!expensesLoading && !expensesError && expenses.length > 0 && filteredExpenses.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 p-8 text-center">
                        <p className="text-sm text-muted">No {categoryFilter} expenses yet.</p>
                      </div>
                    )}

                    {!expensesLoading && !expensesError && filteredExpenses.length > 0 && (
                      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface">
                        {filteredExpenses.map((expense) => (
                          <ExpenseRow
                            key={expense._id}
                            expense={expense}
                            currentUserId={user?.id}
                            onDelete={handleDeleteExpense}
                            deleting={deletingId === expense._id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <BillsPanel groupId={id} members={group.members} />
              </div>
            )}

            {/* ── Balance ── */}
            {activeTab === "balance" && (
              <div className="mt-6 space-y-6">
                <BalancesPanel groupId={id} />
                <PaymentHistoryPanel groupId={id} />
              </div>
            )}

            {/* ── Analytics ── */}
            {activeTab === "analytics" && (
              <div className="mt-6">
                <AnalyticsPanel groupId={id} />
              </div>
            )}

            {/* ── Chat ── */}
            {activeTab === "chat" && (
              <div className="mt-6">
                <ChatPanel groupId={id} />
              </div>
            )}
          </>
        )}
      </main>

      <Modal
        open={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        title="Add an expense"
      >
        {group && (
          <AddExpenseForm
            members={group.members}
            currentUserId={user?.id}
            onCreate={handleAddExpense}
            submitting={formSubmitting}
            error={formError}
          />
        )}
      </Modal>
    </div>
  );
}
