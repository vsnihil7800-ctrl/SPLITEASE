const Expense = require("../models/Expense");
const Settlement = require("../models/Settlement");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");
const { getGroupBalances } = require("./groupController");

function fmtInr(n) { return `₹${Number(n).toFixed(2)}`; }
function fmtDate(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

// GET /api/groups/:groupId/export/csv
const exportCSV = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId).populate("members", "name email");
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("Not a member"); }

  const expenses = await Expense.find({ groupId: group._id })
    .populate("paidBy", "name")
    .sort({ date: -1 });
  const settlements = await Settlement.find({ groupId: group._id })
    .populate("fromUser", "name")
    .populate("toUser", "name")
    .sort({ createdAt: -1 });

  const lines = [];

  lines.push(`Group: ${group.name}`);
  lines.push(`Exported: ${fmtDate(new Date())}`);
  lines.push("");

  lines.push("EXPENSES");
  lines.push("Date,Title,Category,Paid By,Amount,Split Type,Participants");
  for (const e of expenses) {
    lines.push([
      fmtDate(e.date),
      `"${e.title}"`,
      e.category || "Other",
      e.paidBy?.name || "",
      e.amount.toFixed(2),
      e.splitType,
      e.splits.length,
    ].join(","));
  }

  lines.push("");
  lines.push("SETTLEMENTS");
  lines.push("Date,From,To,Amount,Status");
  for (const s of settlements) {
    lines.push([
      fmtDate(s.createdAt),
      s.fromUser?.name || "",
      s.toUser?.name || "",
      s.amount.toFixed(2),
      s.status,
    ].join(","));
  }

  const csv = lines.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="splitease-${group.name.replace(/\s+/g, "-")}.csv"`);
  res.send(csv);
});

// GET /api/groups/:groupId/export/json  (used by frontend PDF generation)
const exportJSON = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId).populate("members", "name email upiId");
  if (!group) { res.status(404); throw new Error("Group not found"); }
  const isMember = group.members.some((m) => m._id.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("Not a member"); }

  const expenses = await Expense.find({ groupId: group._id })
    .populate("paidBy", "name email")
    .populate("splits.userId", "name email")
    .sort({ date: -1 });

  const settlements = await Settlement.find({ groupId: group._id })
    .populate("fromUser", "name email")
    .populate("toUser", "name email")
    .sort({ createdAt: -1 });

  res.json({ group, expenses, settlements });
});

module.exports = { exportCSV, exportJSON };
