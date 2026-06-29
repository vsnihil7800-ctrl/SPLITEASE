const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { updateProfile, changePassword } = require("../controllers/profileController");

router.patch("/", protect, updateProfile);
router.patch("/password", protect, changePassword);

module.exports = router;
