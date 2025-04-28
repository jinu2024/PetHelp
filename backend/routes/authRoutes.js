const express = require("express");
const { registerUser, loginUser } = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
// Get current user's profile
router.get("/me", authMiddleware, (req, res) => {
  res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      location: {
        type: req.user.location.type,
        coordinates: req.user.location.coordinates,
        address: req.user.location.address || "",
      },
      profilePic: req.user.profilePic || "",
      bio: req.user.bio || "",
      rating: req.user.rating || 0,
    },
  });
});


module.exports = router;
