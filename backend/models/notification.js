const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    type: { type: String, enum: ["cancellation", "assignment", "onMyWay", "completed"], required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notification = mongoose.model("Notification", notificationSchema);
module.exports = Notification;