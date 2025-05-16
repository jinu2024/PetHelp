const express = require("express");
const {
  postJob,
  getOpenJobs,
  getMyJobs,
  getMyPostedJobs,
  updateJobImage,
  getJobById,
  markJobComplete,
  getWalkerJobs,
  onMyWay,
  updateWalkerPosition,
  getWalkerPosition,
  cancelAssignment,
} = require("../controllers/jobController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/post", authMiddleware, postJob);
router.get("/open", getOpenJobs);
router.get("/my-jobs", authMiddleware, getMyJobs);
router.get("/my-posted-jobs", authMiddleware, getMyPostedJobs);
router.put("/update-image/:jobId", authMiddleware, updateJobImage);
router.get("/walker", authMiddleware, getWalkerJobs);
router.post("/on-my-way", authMiddleware, onMyWay);
router.get("/:id", authMiddleware, getJobById);
router.post("/update-position", authMiddleware, updateWalkerPosition);
router.get("/:id/walker-position", authMiddleware, getWalkerPosition);
router.post("/mark-complete", authMiddleware, markJobComplete);
router.post("/applications/cancel", authMiddleware, cancelAssignment);

module.exports = router;