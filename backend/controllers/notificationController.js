const Notification = require("../models/Notification");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/notifications
// Returns this user's notifications, newest first, plus an unread count.
// ?limit (default 30, capped at 100) keeps the initial fetch small — the
// live socket "notification" event covers anything that arrives after.
const getMyNotifications = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 30, 100);

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit),
    Notification.countDocuments({ userId: req.user._id, read: false }),
  ]);

  res.json({ notifications, unreadCount });
});

// PATCH /api/notifications/:id/read
// Marks a single notification read. Only the recipient can mark their own.
const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    res.status(404);
    throw new Error("Notification not found");
  }

  if (notification.userId.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("This notification doesn't belong to you");
  }

  notification.read = true;
  await notification.save();

  res.json({ notification });
});

// PATCH /api/notifications/read-all
// Marks every one of this user's unread notifications read in one go —
// what a "mark all as read" button calls.
const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { userId: req.user._id, read: false },
    { $set: { read: true } }
  );

  res.json({ modifiedCount: result.modifiedCount });
});

module.exports = {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
