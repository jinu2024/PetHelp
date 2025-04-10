const express = require("express");
const { postJob, getOpenJobs, getMyJobs, getMyPostedJobs, updateJobImage } = require("../controllers/jobController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

router.post("/post", authMiddleware, postJob);
router.get("/open", getOpenJobs);
router.get("/my-jobs", authMiddleware, getMyJobs);
router.get("/my-posted-jobs", authMiddleware, getMyPostedJobs);
router.get("/update-image/:jobId", authMiddleware, updateJobImage);


module.exports = router;
