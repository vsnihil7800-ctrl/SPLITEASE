const Expense = require("../models/Expense");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");
const { notify } = require("../utils/notify");
const { logActivity } = require("../utils/activityLogger");

const VALID_CATEGORIES = ["Food", "Travel", "Rent", "Utilities", "Entertainment", "Other"];

const buildEqualSplits = (amount, userIds) => {
  const share = Math.floor((amount / userIds.length) * 100) / 100;
  const splits = userIds.map((userId) => ({ userId, amount: share }));
  const allocated = share * userIds.length;
  const remainder = Math.round((amount - allocated) * 100) / 100;
  if (remainder !== 0) splits[0].amount = Math.round((splits[0].amount + remainder) * 100) / 100;
  return splits;
};

const splitsSumMatchesAmount = (splits, amount) => {
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(total - amount) < 0.005;
};

// POST /api/expenses
const createExpense = asyncHandler(async (req, res) => {
  const { groupId, title, amount, paidBy, splitType, splits, category, date } = req.body;

  if (!groupId || !title || !title.trim() || amount === undefined || !paidBy) {
    res.status(400); throw new Error("groupId, title, amount, and paidBy are required");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400); throw new Error("Amount must be a positive number");
  }

  const group = await Group.findById(groupId);
  if (!group) { res.status(404); throw new Error("Group not found"); }

  const memberIds = group.members.map((m) => m.toString());
  if (!memberIds.includes(req.user._id.toString())) {
    res.status(403); throw new Error("You're not a member of this group");
  }
  if (!memberIds.includes(paidBy.toString())) {
    res.status(400); throw new Error("paidBy must be a member of this group");
  }

  const resolvedSplitType = splitType === "custom" ? "custom" : "equal";
  let resolvedSplits;

  if (resolvedSplitType === "equal") {
    const participantIds = Array.isArray(splits) && splits.length > 0
      ? splits.map((s) => s.userId) : memberIds;
    const invalidParticipant = participantIds.find((id) => !memberIds.includes(id.toString()));
    if (invalidParticipant) { res.status(400); throw new Error("All split participants must be group members"); }
    resolvedSplits = buildEqualSplits(numericAmount, participantIds);
  } else {
    if (!Array.isArray(splits) || splits.length === 0) {
      res.status(400); throw new Error("Custom split requires a non-empty splits array");
    }
    const invalidParticipant = splits.find((s) => !memberIds.includes(s.userId?.toString()));
    if (invalidParticipant) { res.status(400); throw new Error("All split participants must be group members"); }
    if (!splitsSumMatchesAmount(splits, numericAmount)) {
      res.status(400); throw new Error("Custom split amounts must add up to the total");
    }
    resolvedSplits = splits.map((s) => ({ userId: s.userId, amount: Number(s.amount) }));
  }

  const resolvedCategory = VALID_CATEGORIES.includes(category) ? category : "Other";

  const expense = await Expense.create({
    groupId, title: title.trim(), amount: numericAmount, paidBy,
    splitType: resolvedSplitType, splits: resolvedSplits,
    category: resolvedCategory, date: date || Date.now(),
  });

  const populated = await Expense.findById(expense._id)
    .populate("paidBy", "name email upiId")
    .populate("splits.userId", "name email upiId");

  // Notify all group members except the payer
  const io = req.app.get("io");
  for (const memberId of memberIds) {
    if (memberId !== paidBy.toString()) {
      await notify(io, {
        userId: memberId,
        type: "expense_created",
        title: "New expense added",
        message: `${populated.paidBy.name} added "${title.trim()}" for ₹${numericAmount.toFixed(2)} in ${group.name}.`,
        groupId,
      });
    }
  }

  // Log to activity feed
  await logActivity(io, {
    groupId, actor: req.user._id, type: "expense_created",
    meta: { title: title.trim(), amount: numericAmount, category: resolvedCategory },
  });

  res.status(201).json({ expense: populated });
});

// GET /api/expenses/group/:groupId
const getExpensesByGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("You're not a member of this group"); }

  const expenses = await Expense.find({ groupId: req.params.groupId })
    .populate("paidBy", "name email upiId")
    .populate("splits.userId", "name email upiId")
    .sort({ date: -1, createdAt: -1 });

  res.json({ expenses });
});

// DELETE /api/expenses/:id
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) { res.status(404); throw new Error("Expense not found"); }
  if (expense.paidBy.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Only the person who paid can delete this expense");
  }

  await logActivity(req.app.get("io"), {
    groupId: expense.groupId, actor: req.user._id, type: "expense_deleted",
    meta: { title: expense.title, amount: expense.amount },
  });

  await expense.deleteOne();
  res.json({ message: "Expense deleted", id: req.params.id });
});

module.exports = { createExpense, getExpensesByGroup, deleteExpense, buildEqualSplits, splitsSumMatchesAmount };
