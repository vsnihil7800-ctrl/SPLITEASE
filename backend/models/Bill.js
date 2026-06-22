const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Bill title is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Rent",
        "Electricity",
        "WiFi",
        "Water",
        "Maid",
        "Groceries",
        "Misc",
      ],
      default: "Misc",
    },
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "paid"],
          default: "pending",
        },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "partially paid", "paid"],
      default: "pending",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Keep overall bill status in sync with member statuses
BillSchema.methods.recomputeStatus = function () {
  const paidCount = this.members.filter((m) => m.status === "paid").length;
  if (paidCount === 0) this.status = "pending";
  else if (paidCount === this.members.length) this.status = "paid";
  else this.status = "partially paid";
};

module.exports = mongoose.model("Bill", BillSchema);
