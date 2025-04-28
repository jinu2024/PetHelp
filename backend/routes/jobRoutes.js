const express = require("express");
const { postJob, getOpenJobs, getMyJobs, getMyPostedJobs, updateJobImage, getJobById } = require("../controllers/jobController");
const authMiddleware = require("../middleware/authMiddleware");


const router = express.Router();

router.post("/post", authMiddleware, postJob);
router.get("/open", getOpenJobs);
router.get("/my-jobs", authMiddleware, getMyJobs);
router.get("/my-posted-jobs", authMiddleware, getMyPostedJobs);
router.get("/:id", authMiddleware, getJobById)
router.put("/update-image/:jobId", authMiddleware, updateJobImage);


module.exports = router;
