const express = require("express");
const { applyForJob, getMyApplications, updateApplicationStatus } = require("../controllers/applicationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/apply", authMiddleware, applyForJob);
router.get("/my-applications", authMiddleware, getMyApplications);
router.patch("/update-status", authMiddleware, updateApplicationStatus);

module.exports = router;
