const Bill = require("../models/Bill");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");

const VALID_CATEGORIES = [
  "Rent",
  "Electricity",
  "WiFi",
  "Water",
  "Maid",
  "Groceries",
  "Misc",
];

// Splits `amount` equally among `userIds`, rounding to 2 decimal places.
// Any leftover paisa from rounding is assigned to the first user so the
// member shares always sum EXACTLY to `amount`. Same strategy as
// expenseController's buildEqualSplits.
const buildEqualShares = (amount, userIds) => {
  const share = Math.floor((amount / userIds.length) * 100) / 100;
  const shares = userIds.map((userId) => ({ userId, amount: share }));

  const allocated = share * userIds.length;
  const remainder = Math.round((amount - allocated) * 100) / 100;

  if (remainder !== 0) {
    shares[0].amount = Math.round((shares[0].amount + remainder) * 100) / 100;
  }

  return shares;
};

// Validates that custom member shares sum to the bill amount, within a
// floating-point-safe tolerance of half a paisa.
const sharesSumMatchesAmount = (shares, amount) => {
  const total = shares.reduce((sum, s) => sum + s.amount, 0);
  return Math.abs(total - amount) < 0.005;
};

async function assertMembership(groupId, userId, res) {
  const group = await Group.findById(groupId);
  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }
  const isMember = group.members.some((m) => m.toString() === userId.toString());
  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }
  return group;
}

// POST /api/bills
// Body: { groupId, title, amount, dueDate, category, splitType, members }
// `members` for splitType "equal" is [{userId}] (amount computed server-side);
// for splitType "custom" it's [{userId, amount}] (amounts must sum to total).
// If `members` is omitted entirely, defaults to an equal split among all
// group members (mirrors expenseController's default-to-everyone behavior).
const createBill = asyncHandler(async (req, res) => {
  const { groupId, title, amount, dueDate, category, splitType, members } = req.body;

  if (!groupId || !title || !title.trim() || amount === undefined || !dueDate) {
    res.status(400);
    throw new Error("groupId, title, amount, and dueDate are required");
  }

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    res.status(400);
    throw new Error("Amount must be a positive number");
  }

  if (category && !VALID_CATEGORIES.includes(category)) {
    res.status(400);
    throw new Error("Invalid bill category");
  }

  const parsedDueDate = new Date(dueDate);
  if (Number.isNaN(parsedDueDate.getTime())) {
    res.status(400);
    throw new Error("dueDate must be a valid date");
  }

  const group = await assertMembership(groupId, req.user._id, res);
  const memberIds = group.members.map((m) => m.toString());

  const resolvedSplitType = splitType === "custom" ? "custom" : "equal";
  let resolvedMembers;

  if (resolvedSplitType === "equal") {
    // Equal split defaults to ALL group members unless the caller explicitly
    // passed a subset of userIds to split among.
    const participantIds =
      Array.isArray(members) && members.length > 0
        ? members.map((m) => m.userId)
        : memberIds;

    const invalidParticipant = participantIds.find(
      (id) => !memberIds.includes(id?.toString())
    );
    if (invalidParticipant) {
      res.status(400);
      throw new Error("All bill members must be members of this group");
    }

    resolvedMembers = buildEqualShares(numericAmount, participantIds).map((s) => ({
      ...s,
      status: "pending",
    }));
  } else {
    if (!Array.isArray(members) || members.length === 0) {
      res.status(400);
      throw new Error("Custom split requires a non-empty members array");
    }

    const invalidMember = members.find(
      (m) => !memberIds.includes(m.userId?.toString())
    );
    if (invalidMember) {
      res.status(400);
      throw new Error("All bill members must be members of this group");
    }

    if (!sharesSumMatchesAmount(members, numericAmount)) {
      res.status(400);
      throw new Error("Member amounts must add up to the total bill amount");
    }

    resolvedMembers = members.map((m) => ({
      userId: m.userId,
      amount: Number(m.amount),
      status: "pending",
    }));
  }

  const bill = await Bill.create({
    groupId,
    title: title.trim(),
    amount: numericAmount,
    dueDate: parsedDueDate,
    category: category || "Misc",
    members: resolvedMembers,
    status: "pending",
    createdBy: req.user._id,
  });

  const populated = await Bill.findById(bill._id)
    .populate("members.userId", "name email upiId")
    .populate("createdBy", "name email upiId");

  res.status(201).json({ bill: populated });
});

// GET /api/bills/group/:groupId
const getBillsByGroup = asyncHandler(async (req, res) => {
  await assertMembership(req.params.groupId, req.user._id, res);

  const bills = await Bill.find({ groupId: req.params.groupId })
    .populate("members.userId", "name email upiId")
    .populate("createdBy", "name email upiId")
    .sort({ dueDate: 1 });

  res.json({ bills });
});

// PATCH /api/bills/:billId/mark-paid
// Body: { userId } — marks that specific member's share as paid.
// Only the member themself, or the bill's creator, may mark a share paid.
const markBillPaid = asyncHandler(async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    res.status(400);
    throw new Error("userId is required");
  }

  const bill = await Bill.findById(req.params.billId);
  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }

  const callerId = req.user._id.toString();
  const isCreator = bill.createdBy.toString() === callerId;
  const isTargetUser = userId.toString() === callerId;

  if (!isCreator && !isTargetUser) {
    res.status(403);
    throw new Error("Only the member themself or the bill creator can mark this paid");
  }

  const member = bill.members.find((m) => m.userId.toString() === userId.toString());
  if (!member) {
    res.status(404);
    throw new Error("That user is not part of this bill");
  }

  if (member.status === "paid") {
    res.status(400);
    throw new Error("This member's share is already marked as paid");
  }

  member.status = "paid";
  bill.recomputeStatus();
  await bill.save();

  const populated = await Bill.findById(bill._id)
    .populate("members.userId", "name email upiId")
    .populate("createdBy", "name email upiId");

  res.json({ bill: populated });
});

// DELETE /api/bills/:billId
// Only the bill's creator can delete it.
const deleteBill = asyncHandler(async (req, res) => {
  const bill = await Bill.findById(req.params.billId);

  if (!bill) {
    res.status(404);
    throw new Error("Bill not found");
  }

  if (bill.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the person who created this bill can delete it");
  }

  await bill.deleteOne();

  res.json({ message: "Bill deleted", id: req.params.billId });
});

module.exports = {
  createBill,
  getBillsByGroup,
  markBillPaid,
  deleteBill,
  buildEqualShares, // exported for unit testing
  sharesSumMatchesAmount, // exported for unit testing
};
