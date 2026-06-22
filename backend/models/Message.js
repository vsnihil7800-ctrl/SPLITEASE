const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      // not required - system messages have no human sender
    },
    senderName: {
      type: String,
      default: "System",
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["user", "system"],
      default: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
