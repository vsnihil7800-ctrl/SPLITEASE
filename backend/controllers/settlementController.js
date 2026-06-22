const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const Expense = require("../models/Expense");
const { asyncHandler } = require("../middleware/errorHandler");
const { computeNetBalances, simplifyDebts } = require("../utils/balanceEngine");

// ─── helpers ──────────────────────────────────────────────────────────────────

async function assertMembership(groupId, userId, res) {
  const group = await Group.findById(groupId).populate(
    "members",
    "name email upiId"
  );
  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }
  const isMember = group.members.some(
    (m) => m._id.toString() === userId.toString()
  );
  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }
  return group;
}

// ─── POST /api/settlements ────────────────────────────────────────────────────
// Body: { groupId, fromUser, toUser, amount }
// Creates a pending settlement record. Typically called when one person taps
// "Record payment" against a suggested debt transaction.
const createSettlement = asyncHandler(async (req, res) => {
  const { groupId, fromUser, toUser, amount } = req.body;

  if (!groupId || !fromUser || !toUser || !amount) {
    res.status(400);
    throw new Error("groupId, fromUser, toUser, and amount are required");
  }

  if (typeof amount !== "number" || amount <= 0) {
    res.status(400);
    throw new Error("amount must be a positive number");
  }

  if (fromUser === toUser) {
    res.status(400);
    throw new Error("fromUser and toUser must be different people");
  }

  // Caller must be a group member
  const group = await assertMembership(groupId, req.user._id, res);

  // Both fromUser and toUser must also be members
  const memberIds = group.members.map((m) => m._id.toString());
  if (!memberIds.includes(fromUser) || !memberIds.includes(toUser)) {
    res.status(400);
    throw new Error("fromUser and toUser must both be group members");
  }

  const settlement = await Settlement.create({
    groupId,
    fromUser,
    toUser,
    amount,
    status: "pending",
  });

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  res.status(201).json({ settlement: populated });
});

// ─── PATCH /api/settlements/:id/mark-paid ────────────────────────────────────
// Marks a settlement as paid. Only the fromUser (payer) or toUser (receiver)
// of the settlement may do this.
const markSettlementPaid = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);

  if (!settlement) {
    res.status(404);
    throw new Error("Settlement not found");
  }

  const callerId = req.user._id.toString();
  const fromId = settlement.fromUser.toString();
  const toId = settlement.toUser.toString();

  if (callerId !== fromId && callerId !== toId) {
    res.status(403);
    throw new Error(
      "Only the payer or receiver of this settlement can mark it paid"
    );
  }

  if (settlement.status === "paid") {
    res.status(400);
    throw new Error("This settlement is already marked as paid");
  }

  settlement.status = "paid";
  await settlement.save();

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  res.json({ settlement: populated });
});

// ─── GET /api/settlements/group/:groupId ─────────────────────────────────────
// Returns all settlement records for a group (pending + paid), newest first.
const getGroupSettlements = asyncHandler(async (req, res) => {
  await assertMembership(req.params.groupId, req.user._id, res);

  const settlements = await Settlement.find({ groupId: req.params.groupId })
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId")
    .sort({ createdAt: -1 });

  res.json({ settlements });
});

module.exports = { createSettlement, markSettlementPaid, getGroupSettlements };
