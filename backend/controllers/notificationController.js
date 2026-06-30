const Notification = require("../models/Notification");
const User = require("../models/User");
const { asyncHandler } = require("../middleware/errorHandler");

// GET /api/notifications/vapid-public-key
// Returns the VAPID public key so the frontend can subscribe via PushManager.
const getVapidPublicKey = asyncHandler(async (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503);
    throw new Error("Web push is not configured on this server");
  }
  res.json({ vapidPublicKey: key });
});

// POST /api/notifications/push-subscribe
// Body: { subscription } — the PushSubscription JSON from the browser.
// Upserts by endpoint so re-subscribing the same device is idempotent.
const subscribePush = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400);
    throw new Error("Invalid push subscription object");
  }

  const user = await User.findById(req.user._id).select("+pushSubscriptions");
  if (!user) { res.status(404); throw new Error("User not found"); }

  // Remove any existing entry for this endpoint, then append fresh one.
  user.pushSubscriptions = user.pushSubscriptions.filter(
    (s) => s.endpoint !== subscription.endpoint
  );
  user.pushSubscriptions.push({
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  });
  await user.save();

  res.json({ ok: true });
});

// POST /api/notifications/push-unsubscribe
// Body: { endpoint } — removes that device's subscription.
const unsubscribePush = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) { res.status(400); throw new Error("endpoint is required"); }

  const user = await User.findById(req.user._id).select("+pushSubscriptions");
  if (!user) { res.status(404); throw new Error("User not found"); }

  user.pushSubscriptions = user.pushSubscriptions.filter((s) => s.endpoint !== endpoint);
  await user.save();

  res.json({ ok: true });
});

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
  subscribePush,
  unsubscribePush,
  getVapidPublicKey,
};

