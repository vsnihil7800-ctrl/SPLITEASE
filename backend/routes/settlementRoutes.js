const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createSettlement,
  markSettlementPaid,
  getGroupSettlements,
} = require("../controllers/settlementController");

// GET  /api/settlements/group/:groupId  — list all settlements for a group
// POST /api/settlements                 — create a new settlement record
// PATCH /api/settlements/:id/mark-paid  — mark a settlement as paid

router.get("/group/:groupId", protect, getGroupSettlements);
router.post("/", protect, createSettlement);
router.patch("/:id/mark-paid", protect, markSettlementPaid);

module.exports = router;
