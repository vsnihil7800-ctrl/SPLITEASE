const Message = require("../models/Message");
const Group = require("../models/Group");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/messages/group/:groupId
// Returns chat history for a group, oldest first (so the frontend can
// render top-to-bottom and append new live messages at the bottom).
// Optional ?before=<ISO date> + ?limit=<n> for paginated backward-scroll —
// without them, returns the most recent `limit` messages in chronological order.
const getMessagesByGroup = asyncHandler(async (req, res) => {
  const group = await Group.findById(req.params.groupId);
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

  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const query = { groupId: req.params.groupId };

  if (req.query.before) {
    const beforeDate = new Date(req.query.before);
    if (!Number.isNaN(beforeDate.getTime())) {
      query.createdAt = { $lt: beforeDate };
    }
  }

  // Fetch newest-first to apply the limit to the most recent page,
  // then reverse to chronological order for rendering.
  const messages = await Message.find(query)
    .populate("sender", "name email upiId")
    .sort({ createdAt: -1 })
    .limit(limit);

  res.json({ messages: messages.reverse() });
});

module.exports = { getMessagesByGroup };
