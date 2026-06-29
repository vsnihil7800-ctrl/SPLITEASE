const mongoose = require("mongoose");

const RecurringExpenseSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["Food", "Travel", "Rent", "Utilities", "Entertainment", "Other"],
      default: "Other",
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly"],
      required: true,
    },
    splitType: {
      type: String,
      enum: ["equal", "custom"],
      default: "equal",
    },
    splits: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount: { type: Number },
      },
    ],
    nextDue: {
      type: Date,
      required: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

RecurringExpenseSchema.index({ groupId: 1, active: 1, nextDue: 1 });

module.exports = mongoose.model("RecurringExpense", RecurringExpenseSchema);
