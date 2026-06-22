const crypto = require("crypto");
const Group = require("../models/Group");
const User = require("../models/User");
const Expense = require("../models/Expense");
const Bill = require("../models/Bill");
const Settlement = require("../models/Settlement");
const { asyncHandler } = require("../middleware/errorHandler");
const { computeNetBalances, simplifyDebts } = require("../utils/balanceEngine");
const {
  buildCategoryBreakdown,
  buildSpendOverTime,
  buildMemberContributions,
} = require("../utils/analyticsEngine");

// Generates a short, human-typeable invite code (e.g. "7F3K9A")
// and guarantees uniqueness against existing groups.
const generateUniqueInviteCode = async () => {
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
  let code;
  let exists = true;

  while (exists) {
    code = Array.from({ length: 6 }, () =>
      ALPHABET[crypto.randomInt(0, ALPHABET.length)]
    ).join("");
    exists = await Group.exists({ inviteCode: code });
  }

  return code;
};

// POST /api/groups
const createGroup = asyncHandler(async (req, res) => {
  const { name, description, groupType } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error("Group name is required");
  }

  const validTypes = ["Stay", "Trip", "Sports Team", "General"];
  if (groupType && !validTypes.includes(groupType)) {
    res.status(400);
    throw new Error("Invalid group type");
  }

  const inviteCode = await generateUniqueInviteCode();

  const group = await Group.create({
    name: name.trim(),
    description: description || "",
    groupType: groupType || "General",
    members: [req.user._id],
    inviteCode,
    createdBy: req.user._id,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { groups: group._id },
  });

  const populated = await Group.findById(group._id).populate(
    "members",
    "name email upiId"
  );

  res.status(201).json({ group: populated });
});

// GET /api/groups
// Returns all groups the logged-in user is a member of.
const getMyGroups = asyncHandler(async (req, res) => {
  const groups = await Group.find({ members: req.user._id })
    .populate("members", "name email upiId")
    .sort({ updatedAt: -1 });

  res.json({ groups });
});

// GET /api/groups/:id
const getGroupById = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate(
    "members",
    "name email upiId"
  );

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isMember = group.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }

  res.json({ group });
});

// POST /api/groups/join
// Body: { inviteCode }
const joinGroup = asyncHandler(async (req, res) => {
  const { inviteCode } = req.body;

  if (!inviteCode || !inviteCode.trim()) {
    res.status(400);
    throw new Error("Invite code is required");
  }

  const group = await Group.findOne({
    inviteCode: inviteCode.trim().toUpperCase(),
  });

  if (!group) {
    res.status(404);
    throw new Error("No group found with that invite code");
  }

  const alreadyMember = group.members.some(
    (m) => m.toString() === req.user._id.toString()
  );

  if (alreadyMember) {
    res.status(400);
    throw new Error("You're already a member of this group");
  }

  group.members.push(req.user._id);
  await group.save();

  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { groups: group._id },
  });

  const populated = await Group.findById(group._id).populate(
    "members",
    "name email upiId"
  );

  res.json({ group: populated });
});

// GET /api/groups/:id/balances
const getGroupBalances = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id).populate(
    "members",
    "name email upiId"
  );

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isMember = group.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }

  const expenses = await Expense.find({ groupId: group._id })
    .populate("paidBy", "name email upiId")
    .populate("splits.userId", "name email upiId");

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const memberMap = new Map();
  for (const m of group.members) {
    memberMap.set(m._id.toString(), {
      name: m.name,
      email: m.email,
      upiId: m.upiId || null,
    });
  }

  const netMap = computeNetBalances(expenses);

  // Ensure every member appears even if they have no expenses yet
  for (const m of group.members) {
    const key = m._id.toString();
    if (!netMap.has(key)) netMap.set(key, 0);
  }

  const netBalances = Array.from(netMap.entries()).map(([id, net]) => ({
    user: {
      id,
      ...(memberMap.get(id) || { name: "Unknown", email: "", upiId: null }),
    },
    net,
  }));

  const suggestedPayments = simplifyDebts(netMap, memberMap);

  res.json({ netBalances, suggestedPayments, totalExpenses });
});

// GET /api/groups/:id/settlements
const getGroupSettlements = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.id);

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isMember = group.members.some(
    (m) => m.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }

  const settlements = await Settlement.find({ groupId: group._id })
    .populate("fromUser", "name email upiId")
    .populate("toUser", "name email upiId")
    .sort({ createdAt: -1 });

  res.json({ settlements });
});

// GET /api/groups/:id/analytics
// Query: ?granularity=month|day (default "month")
// Aggregation-only endpoint — no new models, reuses Expense/Bill exactly
// the same way getGroupBalances reuses Expense, and follows the same
// membership-check-then-fetch-then-compute shape.
const getGroupAnalytics = asyncHandler(async (req, res) => {
  const granularity = req.query.granularity === "day" ? "day" : "month";

  const group = await Group.findById(req.params.id).populate(
    "members",
    "name email upiId"
  );

  if (!group) {
    res.status(404);
    throw new Error("Group not found");
  }

  const isMember = group.members.some(
    (m) => m._id.toString() === req.user._id.toString()
  );

  if (!isMember) {
    res.status(403);
    throw new Error("You're not a member of this group");
  }

  const [expenses, bills] = await Promise.all([
    Expense.find({ groupId: group._id }).populate("paidBy", "name email upiId"),
    Bill.find({ groupId: group._id }),
  ]);

  const memberMap = new Map();
  for (const m of group.members) {
    memberMap.set(m._id.toString(), {
      name: m.name,
      email: m.email,
      upiId: m.upiId || null,
    });
  }

  const totalExpenses = round2Sum(expenses.map((e) => e.amount));
  const totalBills = round2Sum(bills.map((b) => b.amount));

  const categoryBreakdown = buildCategoryBreakdown(expenses, bills);
  const spendOverTime = buildSpendOverTime(expenses, bills, granularity);
  const memberContributions = buildMemberContributions(expenses, memberMap);

  res.json({
    totalExpenses,
    totalBills,
    totalSpend: round2Sum([totalExpenses, totalBills]),
    expenseCount: expenses.length,
    billCount: bills.length,
    categoryBreakdown,
    spendOverTime,
    memberContributions,
  });
});

// Local helper — sums an array of numbers and rounds once at the end
// (avoids compounding floating-point drift from rounding every addend).
const round2Sum = (nums) =>
  Math.round(nums.reduce((sum, n) => sum + n, 0) * 100) / 100;

module.exports = {
  createGroup,
  getMyGroups,
  getGroupById,
  joinGroup,
  getGroupBalances,
  getGroupSettlements,
  getGroupAnalytics,
};
