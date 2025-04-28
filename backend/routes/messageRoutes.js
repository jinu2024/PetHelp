const express = require("express");
const { getConversations, getMessages } = require("../controllers/messageController");
const authMiddleware = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const Message = require("../models/message");

const router = express.Router();

router.get("/conversations", authMiddleware, getConversations);

router.get("/unread/:senderId", authMiddleware, async (req, res) => {
  try {
    const { senderId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "Invalid sender ID" });
    }

    const count = await Message.countDocuments({
      sender: senderId,
      receiver: req.user._id,
      read: false,
    });

    res.json({ count });
  } catch (err) {
    console.error("Get Unread Count Error:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark messages as read for a specific partner
router.post("/mark-read/:partnerId", authMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(partnerId)) {
      return res.status(400).json({ message: "Invalid partner ID" });
    }

    await Message.updateMany(
      { sender: partnerId, receiver: userId, read: false },
      { $set: { read: true } }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    console.error("Mark Read Error:", error.message, error.stack);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

// Generic route kept last
router.get("/:userId", authMiddleware, getMessages);

module.exports = router;