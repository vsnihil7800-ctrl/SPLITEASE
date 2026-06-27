const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const { asyncHandler } = require("../middleware/errorHandler");

async function assertMembership(groupId, userId, res) {
  const group = await Group.findById(groupId).populate("members", "name email upiId");
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m._id.toString() === userId.toString());
  if (!isMember) { res.status(403); throw new Error("You're not a member of this group"); }
  return group;
}

// POST /api/settlements
// Payer records that they paid. Status = pending (waiting for receiver to confirm)
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

  const group = await assertMembership(groupId, req.user._id, res);
  const memberIds = group.members.map((m) => m._id.toString());
  if (!memberIds.includes(fromUser) || !memberIds.includes(toUser)) {
    res.status(400);
    throw new Error("fromUser and toUser must both be group members");
  }

  // Only the payer (fromUser) can create a settlement request
  if (req.user._id.toString() !== fromUser) {
    res.status(403);
    throw new Error("Only the payer can record a payment");
  }

  const settlement = await Settlement.create({
    groupId, fromUser, toUser, amount, status: "pending",
  });

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  res.status(201).json({ settlement: populated });
});

// PATCH /api/settlements/:id/confirm
// Only the receiver (toUser) can confirm
const confirmSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }

  if (settlement.toUser.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the receiver can confirm a payment");
  }
  if (settlement.status !== "pending") {
    res.status(400);
    throw new Error(`Settlement is already ${settlement.status}`);
  }

  settlement.status = "confirmed";
  settlement.confirmedAt = new Date();
  await settlement.save();

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  res.json({ settlement: populated });
});

// PATCH /api/settlements/:id/reject
// Only the receiver (toUser) can reject
const rejectSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }

  if (settlement.toUser.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Only the receiver can reject a payment");
  }
  if (settlement.status !== "pending") {
    res.status(400);
    throw new Error(`Settlement is already ${settlement.status}`);
  }

  settlement.status = "rejected";
  settlement.rejectedAt = new Date();
  await settlement.save();

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  res.json({ settlement: populated });
});

// GET /api/settlements/group/:groupId
const getGroupSettlements = asyncHandler(async (req, res) => {
  await assertMembership(req.params.groupId, req.user._id, res);

  const settlements = await Settlement.find({ groupId: req.params.groupId })
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId")
    .sort({ createdAt: -1 });

  res.json({ settlements });
});

// Keep old mark-paid for backward compat (maps to confirm)
const markSettlementPaid = asyncHandler(async (req, res) => {
  req.params.id = req.params.id;
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }
  if (settlement.status !== "pending") { res.status(400); throw new Error("Already processed"); }
  settlement.status = "confirmed";
  settlement.confirmedAt = new Date();
  await settlement.save();
  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");
  res.json({ settlement: populated });
});

module.exports = { createSettlement, confirmSettlement, rejectSettlement, markSettlementPaid, getGroupSettlements };
