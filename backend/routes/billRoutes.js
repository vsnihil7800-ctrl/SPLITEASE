const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  createBill,
  getBillsByGroup,
  markBillPaid,
  deleteBill,
} = require("../controllers/billController");

// GET    /api/bills/group/:groupId    — list all bills for a group
// POST   /api/bills                   — create a new bill
// PATCH  /api/bills/:billId/mark-paid — mark a member's share as paid
// DELETE /api/bills/:billId           — delete a bill (creator only)

router.get("/group/:groupId", protect, getBillsByGroup);
router.post("/", protect, createBill);
router.patch("/:billId/mark-paid", protect, markBillPaid);
router.delete("/:billId", protect, deleteBill);

module.exports = router;
