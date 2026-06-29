const Activity = require("../models/Activity");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/groups/:groupId/activity
const getGroupActivity = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
  if (!group) { res.status(404); throw new Error("Group not found"); }

  const isMember = group.members.some((m) => m.toString() === req.user._id.toString());
  if (!isMember) { res.status(403); throw new Error("Not a member of this group"); }

  const activities = await Activity.find({ groupId: req.params.groupId })
    .populate("actor", "name email")
    .sort({ createdAt: -1 })
    .limit(100);

  res.json({ activities });
});

module.exports = { getGroupActivity };
