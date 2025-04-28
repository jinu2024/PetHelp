const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const { updateProfile, getUserById } = require("../controllers/userController");
const User = require("../models/user");
const mongoose = require("mongoose");

// Get all users (for chat interface)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: req.user._id } },
      "_id name profilePic"
    );
    res.json(users);
  } catch (err) {
    console.error("Get Users Error:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Get user status
router.get("/status/:userId", authMiddleware, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const userStatus = req.connectedUsers.get(req.params.userId) || {
      socketId: null,
      lastSeen: null,
    };
    res.json({
      isOnline: !!userStatus.socketId,
      lastSeen: userStatus.lastSeen,
    });
  } catch (err) {
    console.error("Get User Status Error:", err.message, err.stack);
    res.status(500).json({ message: "Server error" });
  }
});

// Update user profile
router.patch("/update-profile", authMiddleware, updateProfile);

// Get user by ID
router.get("/:id", authMiddleware, getUserById);

module.exports = router;