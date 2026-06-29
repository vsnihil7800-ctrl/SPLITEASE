const Activity = require("../models/Activity");

async function logActivity(io, { groupId, actor, type, meta = {} }) {
  try {
    const activity = await Activity.create({ groupId, actor, type, meta });
    const populated = await Activity.findById(activity._id).populate("actor", "name email");
    if (io) io.to(groupId.toString()).emit("activity", populated);
    return populated;
  } catch (err) {
    console.error("logActivity() failed:", err.message);
    return null;
  }
}

module.exports = { logActivity };
