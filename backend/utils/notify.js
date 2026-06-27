const Notification = require("../models/Notification");

// Every authenticated socket auto-joins a personal room named
// `user:<userId>` on connect (see server.js's io.on("connection", ...)) —
// no client-side "join" call needed, unlike group chat rooms. This helper
// is the single place that creates + pushes a notification, so every
// caller (settlementController, and any future feature) gets the same
// persist-then-broadcast behavior without duplicating the pattern.
function personalRoom(userId) {
  return `user:${userId}`;
}

// Persists a Notification document and emits it live to the recipient if
// they're currently connected. If `io` is omitted (e.g. called from a
// context without socket access) it still persists — the recipient will
// just see it next time they fetch their notification list rather than
// getting a live push. Never throws into the caller's flow: a notification
// failure should not roll back or block the action that triggered it
// (e.g. a settlement should still be created even if the notification
// write fails for some reason).
async function notify(io, { userId, type, title, message, groupId, settlementId }) {
  try {
    const notification = await Notification.create({
      userId,
      type,
      title,
      message,
      groupId,
      settlementId,
    });

    if (io) {
      io.to(personalRoom(userId)).emit("notification", notification);
    }

    return notification;
  } catch (err) {
    console.error("notify() failed:", err.message);
    return null;
  }
}

module.exports = { notify, personalRoom };
