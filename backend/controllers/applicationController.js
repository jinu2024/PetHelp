const Job = require("../models/job");
const mongoose = require("mongoose");

// Apply for a job (Only Walkers)
const applyForJob = async (req, res) => {
  try {
    if (req.user.role !== "walker") {
      return res.status(403).json({ message: "Only walkers can apply for jobs" });
    }

    const { jobId } = req.body;

    // Validate jobId format
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    // Check if job exists and is open
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.status !== "open") {
      return res.status(400).json({ message: "Job is not open for applications" });
    }

    // Check if job is already assigned
    if (job.assignedWalker) {
      return res.status(400).json({ message: "Job is already assigned" });
    }

    // Instantly assign walker
    job.assignedWalker = req.user._id;
    job.status = "assigned";
    job.assignmentTimestamp = new Date();
    await job.save();

    // Send Socket.IO notifications
    const io = req.app.get("io"); // Access io from app
    io.to(`user:${job.owner}`).emit("jobAssigned", {
      jobId,
      walkerId: req.user._id,
      walkerName: req.user.name,
      message: `${req.user.name} has been assigned to your job "${job.title}"!`,
    });
    io.to(`user:${req.user._id}`).emit("assignmentConfirmed", {
      jobId,
      message: `You’re assigned to the job "${job.title}" for ₹${job.pay}!`,
    });

    res.status(200).json({
      message: "Job assigned successfully. Note: All payments must be made via the platform (coming soon).",
      job,
    });
  } catch (error) {
    console.error("Error in applyForJob:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Cancel job assignment (Only Owners)
const cancelAssignment = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owners can cancel assignments" });
    }

    const { jobId } = req.body;

    // Validate jobId format
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.owner.toString() !== req.user._id) {
      return res.status(403).json({ message: "You can only cancel your own jobs" });
    }
    if (job.status !== "assigned") {
      return res.status(400).json({ message: "Job is not assigned" });
    }

    // Check cancellation window (15 minutes)
    const timeElapsed = (new Date() - job.assignmentTimestamp) / 1000 / 60;
    if (timeElapsed > 15) {
      return res.status(400).json({ message: "Cancellation window has expired" });
    }

    // Cancel assignment
    const walkerId = job.assignedWalker;
    job.assignedWalker = null;
    job.assignmentTimestamp = null;
    job.status = "open";
    await job.save();

    // Notify both parties
    const io = req.app.get("io"); // Access io from app
    io.to(`user:${job.owner}`).emit("assignmentCanceled", {
      jobId,
      message: `You canceled the assignment for "${job.title}".`,
    });
    io.to(`user:${walkerId}`).emit("assignmentCanceled", {
      jobId,
      message: `The owner canceled your assignment for "${job.title}".`,
    });

    res.status(200).json({
      message: "Assignment canceled successfully. Note: All payments must be made via the platform (coming soon).",
      job,
    });
  } catch (error) {
    console.error("Error in cancelAssignment:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { applyForJob, cancelAssignment };