const express = require("express");
const router = express.Router();
const {
  createGroup,
  getMyGroups,
  getGroupById,
  joinGroup,
  getGroupBalances,
  getGroupSettlements,
  getGroupAnalytics,
} = require("../controllers/groupController");
const { protect } = require("../middleware/auth");

router.use(protect); // every group route requires auth

router.post("/", createGroup);
router.get("/", getMyGroups);
router.post("/join", joinGroup);
router.get("/:id", getGroupById);
router.get("/:id/balances", getGroupBalances);
router.get("/:id/settlements", getGroupSettlements);
router.get("/:id/analytics", getGroupAnalytics);

module.exports = router;
