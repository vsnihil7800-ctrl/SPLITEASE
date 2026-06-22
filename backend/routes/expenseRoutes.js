const express = require("express");
const router = express.Router();
const {
  createExpense,
  getExpensesByGroup,
  deleteExpense,
} = require("../controllers/expenseController");
const { protect } = require("../middleware/auth");

router.use(protect);

router.post("/", createExpense);
router.get("/group/:groupId", getExpensesByGroup);
router.delete("/:id", deleteExpense);

module.exports = router;
