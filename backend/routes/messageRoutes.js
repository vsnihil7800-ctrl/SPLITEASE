const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getMessagesByGroup } = require("../controllers/messageController");

// GET /api/messages/group/:groupId — paginated chat history (?limit, ?before)
// Live messages are sent/received over Socket.io (see server.js), not REST.

router.get("/group/:groupId", protect, getMessagesByGroup);

module.exports = router;
