const Group = require("../models/Group");
const Settlement = require("../models/Settlement");
const { asyncHandler } = require("../middleware/errorHandler");
const { notify } = require("../utils/notify");
const { logActivity } = require("../utils/activityLogger");

async function assertMembership(groupId, userId, res) {
  const group = await Group.findById(groupId).populate("members", "name email upiId");
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m._id.toString() === userId.toString());
  if (!isMember) { res.status(403); throw new Error("You're not a member of this group"); }
  return group;
}

const createSettlement = asyncHandler(async (req, res) => {
  const { groupId, fromUser, toUser, amount } = req.body;
  if (!groupId || !fromUser || !toUser || !amount) {
    res.status(400); throw new Error("groupId, fromUser, toUser, and amount are required");
  }
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400); throw new Error("amount must be a positive number");
  }
  if (fromUser === toUser) { res.status(400); throw new Error("fromUser and toUser must be different"); }

  const group = await assertMembership(groupId, req.user._id, res);
  const memberIds = group.members.map((m) => m._id.toString());
  if (!memberIds.includes(fromUser) || !memberIds.includes(toUser)) {
    res.status(400); throw new Error("fromUser and toUser must both be group members");
  }
  if (req.user._id.toString() !== fromUser) {
    res.status(403); throw new Error("Only the payer can record a payment");
  }

  const settlement = await Settlement.create({ groupId, fromUser, toUser, amount, status: "pending" });
  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");

  const io = req.app.get("io");

  await notify(io, {
    userId: toUser, type: "settlement_created",
    title: "Payment claim received",
    message: `${populated.fromUser.name} says they paid you ₹${amount.toFixed(2)} in ${group.name}. Confirm or reject it.`,
    groupId, settlementId: settlement._id,
  });

  await logActivity(io, {
    groupId, actor: req.user._id, type: "settlement_created",
    meta: { fromName: populated.fromUser.name, toName: populated.toUser.name, amount },
  });

  res.status(201).json({ settlement: populated });
});

const confirmSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }
  if (settlement.toUser.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Only the receiver can confirm a payment");
  }
  if (settlement.status !== "pending") {
    res.status(400); throw new Error(`Settlement is already ${settlement.status}`);
  }

  settlement.status = "confirmed";
  settlement.confirmedAt = new Date();
  await settlement.save();

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");
  const group = await Group.findById(settlement.groupId).select("name");
  const io = req.app.get("io");

  await notify(io, {
    userId: settlement.fromUser, type: "settlement_confirmed",
    title: "Payment confirmed",
    message: `${populated.toUser.name} confirmed your ₹${settlement.amount.toFixed(2)} payment in ${group?.name || "the group"}.`,
    groupId: settlement.groupId, settlementId: settlement._id,
  });

  await logActivity(io, {
    groupId: settlement.groupId, actor: req.user._id, type: "settlement_confirmed",
    meta: { fromName: populated.fromUser.name, toName: populated.toUser.name, amount: settlement.amount },
  });

  res.json({ settlement: populated });
});

const rejectSettlement = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }
  if (settlement.toUser.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Only the receiver can reject a payment");
  }
  if (settlement.status !== "pending") {
    res.status(400); throw new Error(`Settlement is already ${settlement.status}`);
  }

  settlement.status = "rejected";
  settlement.rejectedAt = new Date();
  await settlement.save();

  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");
  const group = await Group.findById(settlement.groupId).select("name");
  const io = req.app.get("io");

  await notify(io, {
    userId: settlement.fromUser, type: "settlement_rejected",
    title: "Payment rejected",
    message: `${populated.toUser.name} says they haven't received your ₹${settlement.amount.toFixed(2)} payment in ${group?.name || "the group"}.`,
    groupId: settlement.groupId, settlementId: settlement._id,
  });

  await logActivity(io, {
    groupId: settlement.groupId, actor: req.user._id, type: "settlement_rejected",
    meta: { fromName: populated.fromUser.name, toName: populated.toUser.name, amount: settlement.amount },
  });

  res.json({ settlement: populated });
});

const getGroupSettlements = asyncHandler(async (req, res) => {
  await assertMembership(req.params.groupId, req.user._id, res);
  const settlements = await Settlement.find({ groupId: req.params.groupId })
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId")
    .sort({ createdAt: -1 });
  res.json({ settlements });
});

const markSettlementPaid = asyncHandler(async (req, res) => {
  const settlement = await Settlement.findById(req.params.id);
  if (!settlement) { res.status(404); throw new Error("Settlement not found"); }
  if (settlement.toUser.toString() !== req.user._id.toString()) {
    res.status(403); throw new Error("Only the receiver can confirm a payment");
  }
  if (settlement.status !== "pending") { res.status(400); throw new Error("Already processed"); }
  settlement.status = "confirmed";
  settlement.confirmedAt = new Date();
  await settlement.save();
  const populated = await Settlement.findById(settlement._id)
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId");
  const group = await Group.findById(settlement.groupId).select("name");
  const io = req.app.get("io");
  await notify(io, {
    userId: settlement.fromUser, type: "settlement_confirmed",
    title: "Payment confirmed",
    message: `${populated.toUser.name} confirmed your ₹${settlement.amount.toFixed(2)} payment in ${group?.name || "the group"}.`,
    groupId: settlement.groupId, settlementId: settlement._id,
  });
  await logActivity(io, {
    groupId: settlement.groupId, actor: req.user._id, type: "settlement_confirmed",
    meta: { fromName: populated.fromUser.name, toName: populated.toUser.name, amount: settlement.amount },
  });
  res.json({ settlement: populated });
});

module.exports = { createSettlement, confirmSettlement, rejectSettlement, markSettlementPaid, getGroupSettlements };
