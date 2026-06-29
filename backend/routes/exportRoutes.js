const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { exportCSV, exportJSON } = require("../controllers/exportController");

router.get("/:groupId/export/csv", protect, exportCSV);
router.get("/:groupId/export/json", protect, exportJSON);

module.exports = router;
