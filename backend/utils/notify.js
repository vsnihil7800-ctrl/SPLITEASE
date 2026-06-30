const webpush = require("web-push");
const Notification = require("../models/Notification");
const User = require("../models/User");

// VAPID credentials must be set in env.  If missing, we skip web push
// silently rather than crashing — the app still works with in-app notifs.
const VAPID_READY =
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_EMAIL;

if (VAPID_READY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

function personalRoom(userId) {
  return `user:${userId}`;
}

// Fires a Web Push to every stored subscription for a user.
// Dead subscriptions (410 Gone / 404) are pruned automatically.
async function sendWebPush(userId, { title, message, url = "/" }) {
  if (!VAPID_READY) return;

  const user = await User.findById(userId).select("+pushSubscriptions");
  if (!user || !user.pushSubscriptions?.length) return;

  const payload = JSON.stringify({ title, body: message, url });
  const deadEndpoints = [];

  await Promise.allSettled(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          payload
        );
      } catch (err) {
        // 410 Gone = subscription expired; 404 = invalid endpoint.
        if (err.statusCode === 410 || err.statusCode === 404) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.warn("web-push error:", err.statusCode, err.message);
        }
      }
    })
  );

  if (deadEndpoints.length) {
    // Prune expired subscriptions in the background — don't await.
    User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint: { $in: deadEndpoints } } },
    }).catch(() => {});
  }
}

// Persists a Notification document, emits it live via Socket.io to any
// open tab, AND fires a Web Push to every registered device for the user.
// Never throws into the caller — a notification failure must never roll
// back the action that triggered it.
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

    // In-app socket push (open tab).
    if (io) {
      io.to(personalRoom(userId)).emit("notification", notification);
    }

    // Web Push (background / locked screen). Fire-and-forget.
    const url = groupId ? `/groups/${groupId}?tab=balance` : "/";
    sendWebPush(userId, { title, message, url }).catch(() => {});

    return notification;
  } catch (err) {
    console.error("notify() failed:", err.message);
    return null;
  }
}

module.exports = { notify, personalRoom };
