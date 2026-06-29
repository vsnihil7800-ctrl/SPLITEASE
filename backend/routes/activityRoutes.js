const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { getGroupActivity } = require("../controllers/activityController");

router.get("/group/:groupId", protect, getGroupActivity);

module.exports = router;
