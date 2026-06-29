const mongoose = require("mongoose");

const ActivitySchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "expense_created",
        "expense_deleted",
        "bill_created",
        "bill_paid",
        "settlement_created",
        "settlement_confirmed",
        "settlement_rejected",
        "member_joined",
      ],
      required: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

ActivitySchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model("Activity", ActivitySchema);
