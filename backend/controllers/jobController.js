const Job = require("../models/job");

// Post a new job (Only Pet Owners)
const postJob = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only pet owners can post jobs" });
    }

    const { title, description, location, pay, image, coordinates } = req.body;

    // Basic validation
    if (!title || !description || !location || !pay) {
      return res.status(400).json({ message: "Please fill in all required fields" });
    }

    const newJob = new Job({
      title,
      description,
      location,
      pay,
      owner: req.user.userId,
      image,
      coordinates,
    });

    await newJob.save();
    res.status(201).json({ message: "Job posted successfully", job: newJob });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};


// PUT: Update job image after successful Cloudinary upload
const updateJobImage = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: "Image URL is required" });
    }

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { image },
      { new: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.status(200).json({ message: "Image updated successfully", job: updatedJob });
  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({ message: "Server error", error });
  }
};



// Get all open jobs
const getOpenJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ status: "open" }).populate("owner", "name location");
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Get jobs posted by a pet owner
const getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only pet owners can view their jobs" });
    }

    const jobs = await Job.find({ owner: req.user.userId });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// GET: Jobs posted by this owner
const getMyPostedJobs = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only owners can access this" });
    }

    const jobs = await Job.find({ owner: req.user._id }).populate({
      path: "applications",
      populate: {
        path: "walker",
        select: "name email",
      },
    });

    res.json(jobs);
  } catch (error) {
    console.error("Error in getMyPostedJobs:", error);
    res.status(500).json({ message: "Server error", error });
  }
};



module.exports = { postJob, getOpenJobs, getMyJobs, getMyPostedJobs, updateJobImage };
