const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { createSettlement, confirmSettlement, rejectSettlement, markSettlementPaid, getGroupSettlements } = require("../controllers/settlementController");

router.get("/group/:groupId", protect, getGroupSettlements);
router.post("/", protect, createSettlement);
router.patch("/:id/confirm", protect, confirmSettlement);
router.patch("/:id/reject", protect, rejectSettlement);
router.patch("/:id/mark-paid", protect, markSettlementPaid); // backward compat

module.exports = router;
