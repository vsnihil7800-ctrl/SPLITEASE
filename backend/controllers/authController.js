const bcrypt = require("bcryptjs");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { asyncHandler } = require("../middleware/errorHandler");

// POST /api/auth/register
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

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    upiId: upiId || "",
  });

  const token = generateToken(user._id);

  res.status(201).json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      upiId: user.upiId,
    },
  });
});

// POST /api/auth/login
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password"
  );

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
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      upiId: user.upiId,
    },
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by the protect middleware (raw Mongoose doc, has `_id`).
  // Normalize to the same { id, name, email, upiId } shape that
  // register/login return, so the frontend can rely on `user.id`
  // consistently regardless of which auth endpoint populated it.
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      upiId: req.user.upiId,
    },
  });
});

module.exports = { registerUser, loginUser, getMe };
