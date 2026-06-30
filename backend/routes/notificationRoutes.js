const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  subscribePush,
  unsubscribePush,
  getVapidPublicKey,
} = require("../controllers/notificationController");

router.get("/", protect, getMyNotifications);
router.patch("/read-all", protect, markAllNotificationsRead);
router.patch("/:id/read", protect, markNotificationRead);

// Web Push subscription management
router.get("/vapid-public-key", protect, getVapidPublicKey);
router.post("/push-subscribe", protect, subscribePush);
router.post("/push-unsubscribe", protect, unsubscribePush);

module.exports = router;
