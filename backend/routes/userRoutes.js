const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const parser = require("../middleware/uploadMiddleware");
const { updateProfile } = require("../controllers/userController");

const router = express.Router();

// PATCH: Update user profile
router.patch("/update-profile", authMiddleware, parser.single("profilePic"), updateProfile);

module.exports = router;
