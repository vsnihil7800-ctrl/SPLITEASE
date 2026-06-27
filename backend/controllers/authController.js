const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { asyncHandler } = require("../middleware/errorHandler");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
// ── helpers ───────────────────────────────────────────────────────────────────

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function normalizeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    upiId: user.upiId,
    isEmailVerified: user.isEmailVerified,
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, upiId } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Name, email, and password are required");
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    res.status(400);
    throw new Error("An account with this email already exists");
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const verifyToken = randomToken();
  const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    upiId: upiId || "",
    isEmailVerified: false,
    emailVerifyToken: verifyToken,
    emailVerifyExpires: verifyExpires,
  });

  // Send verification email (non-fatal — user can request resend)
  sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken })
    .catch((emailErr) => console.error("Failed to send verification email:", emailErr.message));

  const token = generateToken(user._id);

  res.status(201).json({
    token,
    user: normalizeUser(user),
  });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const token = generateToken(user._id);

  res.json({
    token,
    user: normalizeUser(user),
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: normalizeUser(req.user) });
});

// ── GET /api/auth/verify-email?token=... ─────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;

  if (!token) {
    res.status(400);
    throw new Error("Verification token is required");
  }

  const user = await User.findOne({
    emailVerifyToken: token,
    emailVerifyExpires: { $gt: new Date() },
  }).select("+emailVerifyToken +emailVerifyExpires");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired verification link. Please request a new one.");
  }

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpires = undefined;
  await user.save();

  res.json({ message: "Email verified successfully" });
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+emailVerifyToken +emailVerifyExpires");

  // Always respond the same way regardless of whether the user exists
  // (prevents email enumeration)
  if (!user || user.isEmailVerified) {
    return res.json({ message: "If applicable, a new verification email has been sent." });
  }

  const verifyToken = randomToken();
  user.emailVerifyToken = verifyToken;
  user.emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  try {
    await sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken });
  } catch (emailErr) {
    console.error("Failed to resend verification email:", emailErr.message);
  }

  res.json({ message: "If applicable, a new verification email has been sent." });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email: email.toLowerCase() })
    .select("+passwordResetToken +passwordResetExpires");

  // Always return 200 (prevents email enumeration)
  if (!user) {
    return res.json({ message: "If that email is registered, a reset link is on its way." });
  }

  const resetToken = randomToken();
  user.passwordResetToken = resetToken;
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  await user.save();

  try {
    await sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken });
  } catch (emailErr) {
    console.error("Failed to send reset email:", emailErr.message);
    res.status(500);
    throw new Error("Couldn't send the reset email. Please try again later.");
  }

  res.json({ message: "If that email is registered, a reset link is on its way." });
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400);
    throw new Error("Token and new password are required");
  }

  if (password.length < 6) {
    res.status(400);
    throw new Error("Password must be at least 6 characters");
  }

  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: new Date() },
  }).select("+password +passwordResetToken +passwordResetExpires");

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired reset link. Please request a new one.");
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({ message: "Password reset successfully. You can now sign in." });
});

module.exports = {
  registerUser,
  loginUser,
  getMe,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
};
