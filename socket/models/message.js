const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String }, // Optional text
    image: { type: String },   // Optional image URL
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
