const RecurringExpense = require("../models/RecurringExpense");
const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");
const { logActivity } = require("../utils/activityLogger");

function nextDueDate(from, frequency) {
  const d = new Date(from);
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

// POST /api/recurring
const createRecurring = asyncHandler(async (req, res) => {
  const { groupId, title, amount, paidBy, category, frequency, splitType, splits } = req.body;

  if (!groupId || !title || !amount || !paidBy || !frequency) {
    res.status(400); throw new Error("groupId, title, amount, paidBy, frequency required");
  }

  const group = await Group.findById(groupId);
  if (!group) { res.status(404); throw new Error("Group not found"); }

  const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("Not a member"); }

  const rec = await RecurringExpense.create({
    groupId, title, amount: Number(amount), paidBy, category: category || "Other",
    frequency, splitType: splitType || "equal", splits: splits || [],
    nextDue: nextDueDate(new Date(), frequency),
  });

  await logActivity(req.app.get("io"), {
    groupId, actor: req.user._id, type: "expense_created",
    meta: { title: `🔁 Recurring: ${title}`, amount, frequency },
  });

  res.status(201).json({ recurring: rec });
});

// GET /api/recurring/group/:groupId
const getGroupRecurring = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("Not a member"); }

  const recurrings = await RecurringExpense.find({ groupId: req.params.groupId, active: true })
    .populate("paidBy", "name email upiId")
    .populate("splits.userId", "name email")
    .sort({ createdAt: -1 });

  res.json({ recurrings });
});

// DELETE /api/recurring/:id  (deactivate)
const deleteRecurring = asyncHandler(async (req, res) => {
  const rec = await RecurringExpense.findById(req.params.id);
  if (!rec) { res.status(404); throw new Error("Not found"); }
  if (rec.paidBy.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Only the creator can remove this");
  }
  rec.active = false;
  await rec.save();
  res.json({ message: "Recurring expense removed", id: rec._id });
});

// POST /api/recurring/trigger  (manual trigger for testing / cron)
// In production you'd call this from a cron job or Vercel cron
const triggerDue = asyncHandler(async (req, res) => {
  const now = new Date();
  const due = await RecurringExpense.find({ active: true, nextDue: { $lte: now } })
    .populate("paidBy", "name email upiId");

  const created = [];
  for (const rec of due) {
    const expense = await Expense.create({
      groupId: rec.groupId,
      title: rec.title,
      amount: rec.amount,
      paidBy: rec.paidBy._id,
      splitType: rec.splitType,
      splits: rec.splits.length > 0 ? rec.splits : [],
      category: rec.category,
      date: now,
    });
    rec.lastTriggered = now;
    rec.nextDue = nextDueDate(now, rec.frequency);
    await rec.save();
    created.push(expense._id);
  }

  res.json({ triggered: created.length, expenseIds: created });
});

module.exports = { createRecurring, getGroupRecurring, deleteRecurring, triggerDue };
