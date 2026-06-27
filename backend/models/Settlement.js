const mongoose = require("mongoose");

const SettlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    fromUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      // pending  = payer has requested, waiting for receiver to confirm
      // confirmed = receiver confirmed payment received
      // rejected  = receiver rejected the payment claim
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
    },
    confirmedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settlement", SettlementSchema);
