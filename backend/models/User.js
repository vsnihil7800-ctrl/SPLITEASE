const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    email: { type: String, required: [true, "Email is required"], unique: true, lowercase: true, trim: true },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    upiId: { type: String, trim: true, default: "" },
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyExpires: { type: Date, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    // Web Push subscriptions — one per browser/device. Each object matches
    // the PushSubscription JSON shape: { endpoint, keys: { p256dh, auth } }.
    // select: false keeps them out of every normal query (token size + privacy).
    pushSubscriptions: {
      type: [
        {
          endpoint: { type: String, required: true },
          keys: {
            p256dh: { type: String, required: true },
            auth:   { type: String, required: true },
          },
        },
      ],
      select: false,
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
