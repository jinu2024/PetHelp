const mongoose = require("mongoose");
const Job = require("../models/job");
const asyncHandler = require("express-async-handler");
const Notification = require("../models/notification");

// Existing endpoints (unchanged, included for completeness)
const postJob = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only pet owners can post jobs" });
    }
    const { title, description, location, pay, image, coordinates } = req.body;
    if (!title || !description || !location || !pay || !coordinates?.lat || !coordinates?.lng) {
      return res.status(400).json({ message: "Please fill in all required fields including coordinates" });
    }
    const newJob = new Job({
      title,
      description,
      location,
      pay,
      owner: req.user._id,
      image,
      coordinates,
      geoLocation: { type: "Point", coordinates: [coordinates.lng, coordinates.lat] },
    });
    await newJob.save();
    res.status(201).json({
      message: "Job posted successfully. Note: All payments must be made via the platform (coming soon).",
      job: newJob,
    });
  } catch (error) {
    console.error("Error in postJob:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const updateJobImage = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ message: "Image URL is required" });
    }
    const updatedJob = await Job.findByIdAndUpdate(jobId, { image }, { new: true });
    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({ message: "Image updated successfully", job: updatedJob });
  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getOpenJobs = async (req, res) => {
  try {
    const { lat, lng, distance = 10, mode } = req.query;
    if (mode === "all") {
      const jobs = await Job.find({ status: "open" })
        .populate("owner", "name")
        .sort({ createdAt: -1 });
      return res.json(jobs);
    }
    if (!lat || !lng) {
      return res.status(400).json({ message: "lat/lng required unless mode=all" });
    }
    const jobs = await Job.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
          distanceField: "distanceInMeters",
          maxDistance: parseFloat(distance) * 1000,
          spherical: true,
          query: { status: "open" },
        },
      },
      { $lookup: { from: "users", localField: "owner", foreignField: "_id", as: "owner" } },
      { $unwind: "$owner" },
      {
        $project: {
          "owner.name": 1,
          "owner._id": 1,
          title: 1,
          description: 1,
          location: 1,
          coordinates: 1,
          geoLocation: 1,
          image: 1,
          pay: 1,
          assignedWalker: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          distanceInMeters: 1,
        },
      },
      { $sort: { createdAt: -1 } },
    ]);
    const jobsWithKm = jobs.map((job) => ({
      ...job,
      distanceInKm: (job.distanceInMeters / 1000).toFixed(1),
    }));
    res.json(jobsWithKm);
  } catch (error) {
    console.error("Error in getOpenJobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only pet owners can view their jobs" });
    }
    const jobs = await Job.find({ owner: req.user._id })
      .populate("assignedWalker", "name email");
    res.json(jobs);
  } catch (error) {
    console.error("Error in getMyJobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getMyPostedJobs = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owners can access this" });
    }
    const jobs = await Job.find({ owner: req.user._id })
      .populate("assignedWalker", "name email");
    res.json(jobs);
  } catch (error) {
    console.error("Error in getMyPostedJobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
    const job = await Job.findById(id)
      .populate("owner", "name email phone profilePic")
      .populate("assignedWalker", "name profilePic");
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    const response = {
      _id: job._id,
      title: job.title,
      description: job.description,
      pay: job.pay,
      location: job.location,
      geoLocation: job.geoLocation,
      coordinates: job.coordinates,
      image: job.image,
      owner: {
        id: job.owner._id,
        name: job.owner.name,
        email: job.owner.email,
        profilePic: job.owner.profilePic || "",
      },
      assignedWalker: job.assignedWalker
        ? {
            id: job.assignedWalker._id,
            name: job.assignedWalker.name || "Unknown",
            profilePic: job.assignedWalker.profilePic || "",
          }
        : null,
      status: job.status,
      assignmentTimestamp: job.assignmentTimestamp,
      completedAt: job.completedAt,
      onMyWay: job.onMyWay,
    };
    if (req.user.role === "walker" && job.assignedWalker?._id.toString() === req.user._id) {
      response.instructions = job.description || "Follow owner’s instructions";
      response.ownerContact = {
        name: job.owner.name,
        email: job.owner.email,
        phone: job.owner.phone || "Not provided",
      };
    }
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getJobById:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// New: Get jobs assigned to or completed by the walker
const getWalkerJobs = async (req, res) => {
  console.log("Route hit: /walker"); // Debug
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized: User not authenticated" });
    }
    console.log("req.user:", req.user); // Debug
    if (req.user.role !== "walker") {
      return res.status(403).json({ message: "Only walkers can view their assigned or completed jobs" });
    }

    const jobs = await Job.find({
      assignedWalker: req.user._id,
      status: { $in: ["assigned", "completed"] },
    })
      .populate("owner", "name email profilePic")
      .sort({ assignmentTimestamp: -1 });

    const response = jobs.map((job) => ({
      _id: job._id,
      title: job.title,
      description: job.description,
      pay: job.pay,
      location: job.location,
      image: job.image || "https://res.cloudinary.com/demo/image/upload/v1699999999/default-job-image.png",
      owner: {
        id: job.owner._id,
        name: job.owner.name,
        profilePic: job.owner.profilePic || "",
      },
      status: job.status,
      assignmentTimestamp: job.assignmentTimestamp,
      completedAt: job.completedAt,
    }));

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getWalkerJobs:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Existing markJobComplete (from prior response)
const markJobComplete = async (req, res) => {
  try {
    if (req.user.role !== "walker") {
      return res.status(403).json({ message: "Only walkers can mark jobs as complete" });
    }
    const { jobId } = req.body;
    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.assignedWalker?.toString() !== req.user._id) {
      return res.status(403).json({ message: "You are not assigned to this job" });
    }
    if (job.status !== "assigned") {
      return res.status(400).json({ message: "Job is not in assigned status" });
    }
    job.status = "completed";
    job.completedAt = new Date();
    await job.save();
    const io = req.app.get("io");
    io.to(`user:${job.owner}`).emit("jobCompleted", {
      jobId,
      message: `The job "${job.title}" has been marked as completed by ${req.user.name}. Payment is due soon.`,
    });
    io.to(`user:${req.user._id}`).emit("jobCompleted", {
      jobId,
      message: `You marked the job "${job.title}" as completed. Await owner’s payment.`,
    });
    res.status(200).json({
      message: "Job marked as completed. Note: All payments must be made via the platform (coming soon).",
      job,
    });
  } catch (error) {
    console.error("Error in markJobComplete:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// onMyWay function to handle the API request and emit a socket event.
const onMyWay = asyncHandler(async (req, res) => {
  const { jobId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    res.status(400);
    throw new Error("Invalid job ID");
  }

  const job = await Job.findById(jobId)
    .populate("owner", "name email")
    .populate("assignedWalker", "name");
  if (!job) {
    res.status(404);
    throw new Error("Job not found");
  }

  if (
    job.status !== "assigned" ||
    !job.assignedWalker ||
    job.assignedWalker._id.toString() !== req.user._id.toString()
  ) {
    res.status(403);
    throw new Error("Not authorized: You are not assigned to this job");
  }

  if (job.onMyWay) {
    res.status(400);
    throw new Error("Already marked as on the way");
  }

  job.onMyWay = true;
  await job.save();

  const io = req.app.get("io");
  io.to(`user:${job.owner._id}`).emit("walkerOnMyWay", {
    jobId: job._id,
    walkerId: job.assignedWalker._id,
    walkerName: job.assignedWalker.name || "Unknown",
    message: `${job.assignedWalker.name || "Walker"} is on the way to your job!`,
  });

  res.status(200).json({
    _id: job._id,
    onMyWay: job.onMyWay,
    message: "Marked as on the way",
  });
});



const getWalkerPosition = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job || job.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    console.log("jobController.js - Sending walker position:", job.walkerPosition);
    res.json({ walkerPosition: job.walkerPosition });
  } catch (error) {
    console.error("jobController.js - Get walker position error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelAssignment = async (req, res) => {
  const { jobId, reason } = req.body;
  try {
    // Validate input
    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    // Log for debugging
    console.log("jobController.js - cancelAssignment - Job:", {
      _id: job._id,
      owner: job.owner,
      assignedWalker: job.assignedWalker,
      status: job.status,
    });
    console.log("jobController.js - cancelAssignment - req.user:", {
      id: req.user.id,
      _id: req.user._id,
    });

    // Check authorization
    const isOwner = job.owner && job.owner.toString() === req.user.id;
    const isWalker = job.assignedWalker && job.assignedWalker.toString() === req.user.id;
    if (!isOwner && !isWalker) {
      return res.status(403).json({ message: "Unauthorized: User is neither owner nor assigned walker" });
    }

    // Validate job status
    if (job.status !== "assigned") {
      return res.status(400).json({ message: "Job not assigned" });
    }

    // Check cancellation rules
    const timeElapsed = job.assignmentTimestamp ? Date.now() - new Date(job.assignmentTimestamp).getTime() : 0;
    const gracePeriod = 5 * 60 * 1000; // 5 minutes
    if (isOwner && job.onMyWay && timeElapsed > gracePeriod && !reason) {
      return res.status(400).json({ message: "Reason required to cancel after walker is on the way" });
    }

    // Update job
    const walkerId = job.assignedWalker;
    const ownerId = job.owner;
    job.status = "open";
    job.assignedWalker = null;
    job.assignmentTimestamp = null;
    job.onMyWay = false;
    job.walkerPosition = null;
    await job.save();
    console.log("jobController.js - cancelAssignment - Updated job:", job);

    const io = req.app.get("io");
    // Create notifications
    if (isOwner && walkerId) {
      const message = reason ? `Assignment canceled by owner: ${reason}` : "Assignment canceled by owner";
      await Notification.create({
        user: walkerId,
        jobId,
        type: "cancellation",
        message,
      });
      io.to(`user:${walkerId}`).emit("assignmentCanceled", { jobId, message });
    }
    if (isWalker) {
      const message = "Assignment canceled by walker";
      await Notification.create({
        user: ownerId,
        jobId,
        type: "cancellation",
        message,
      });
      io.to(`user:${ownerId}`).emit("assignmentCanceled", { jobId, message });
    }
    io.to(`user:${req.user.id}`).emit("assignmentCanceled", {
      jobId,
      message: "Assignment canceled successfully",
    });

    res.json({ success: true });
  } catch (error) {
    console.error("jobController.js - cancelAssignment error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
};

const updateWalkerPosition = async (req, res) => {
  const { jobId, position } = req.body;
  try {
    // Validate input
    if (!jobId || !position || !Array.isArray(position) || position.length !== 2 || isNaN(position[0]) || isNaN(position[1])) {
      return res.status(400).json({ message: "Invalid jobId or position. Position must be [lat, lng]." });
    }
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }
    if (job.status !== "assigned" || !job.assignedWalker) {
      return res.status(400).json({ message: "Job not assigned" });
    }
    if (job.assignedWalker.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized: Only the assigned walker can update position" });
    }
    if (!job.onMyWay) {
      return res.status(400).json({ message: "Walker must mark 'On My Way' before updating position" });
    }

    const io = req.app.get("io");
    // Convert [lat, lng] to [lng, lat] for MongoDB 2dsphere
    job.walkerPosition = [position[1], position[0]];
    await job.save();
    console.log("jobController.js - updatePosition - Updated job:", job);
    io.to(`user:${job.owner}`).emit("walkerPositionUpdate", {
      jobId,
      position: position, // Send [lat, lng] to frontend
    });
    res.json({ success: true });
  } catch (error) {
    console.error("jobController.js - updatePosition error:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
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
};