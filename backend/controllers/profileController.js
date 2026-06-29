const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { asyncHandler } = require("../middleware/errorHandler");

// PATCH /api/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { name, upiId } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) { res.status(404); throw new Error("User not found"); }

  if (name && name.trim()) user.name = name.trim();
  if (upiId !== undefined) user.upiId = upiId.trim();

  await user.save();

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      upiId: user.upiId,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

// PATCH /api/profile/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400); throw new Error("currentPassword and newPassword are required");
  }
  if (newPassword.length < 6) {
    res.status(400); throw new Error("New password must be at least 6 characters");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!user) { res.status(404); throw new Error("User not found"); }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) { res.status(400); throw new Error("Current password is incorrect"); }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ message: "Password updated successfully" });
});

module.exports = { updateProfile, changePassword };
