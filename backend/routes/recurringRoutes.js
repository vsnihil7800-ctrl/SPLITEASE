const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { createRecurring, getGroupRecurring, deleteRecurring, triggerDue } = require("../controllers/recurringController");

router.post("/", protect, createRecurring);
router.get("/group/:groupId", protect, getGroupRecurring);
router.delete("/:id", protect, deleteRecurring);
router.post("/trigger", protect, triggerDue);

module.exports = router;
