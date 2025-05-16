const express = require("express");
const { applyForJob, cancelAssignment } = require("../controllers/applicationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/apply", authMiddleware, applyForJob);
router.post("/cancel", authMiddleware, cancelAssignment);

module.exports = router;