const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "settlement_created", "settlement_confirmed", "settlement_rejected",
        "expense_created", "bill_created", "bill_paid",
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
    settlementId: { type: mongoose.Schema.Types.ObjectId, ref: "Settlement" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model("Notification", NotificationSchema);
