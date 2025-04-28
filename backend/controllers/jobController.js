const Job = require("../models/job");

// Post a new job (Only Pet Owners)
const postJob = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only pet owners can post jobs" });
    }

    const { title, description, location, pay, image, coordinates } = req.body;

    if (
      !title ||
      !description ||
      !location ||
      !pay ||
      !coordinates?.lat ||
      !coordinates?.lng
    ) {
      return res
        .status(400)
        .json({
          message: "Please fill in all required fields including coordinates",
        });
    }

    const newJob = new Job({
      title,
      description,
      location,
      pay,
      owner: req.user._id, // safer than userId
      image,
      coordinates,
      geoLocation: {
        type: "Point",
        coordinates: [coordinates.lng, coordinates.lat], // [lng, lat]
      },
    });

    await newJob.save();
    res.status(201).json({ message: "Job posted successfully", job: newJob });
  } catch (error) {
    console.error("Error in postJob:", error);
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

    res
      .status(200)
      .json({ message: "Image updated successfully", job: updatedJob });
  } catch (error) {
    console.error("Error updating image:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

// Get all open jobs

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
      return res
        .status(400)
        .json({ message: "lat/lng required unless mode=all" });
    }

    const jobs = await Job.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          distanceField: "distanceInMeters",
          maxDistance: parseFloat(distance) * 1000,
          spherical: true,
          query: { status: "open" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
        },
      },
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
          applications: 1,
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
    res.status(500).json({ message: "Server error", error });
  }
};

// Get jobs posted by a pet owner
const getMyJobs = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only pet owners can view their jobs" });
    }

    const jobs = await Job.find({ owner: req.user._id });
    res.json(jobs);
  } catch (error) {
    console.error("Error in getMyJobs:", error);
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

const getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate("owner", "name profilePic")
      .populate({
        path: "applications",
        populate: { path: "walker", select: "name profilePic" },
      });
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Map applications to match expected frontend format
    const validApplications = job.applications
      .map((app) => {
        if (!app.walker) {
          console.warn(`Invalid application ${app._id} in job ${job._id}: Missing walker`);
          return null;
        }
        return {
          _id: app._id,
          applicant: {
            id: app.walker._id,
            name: app.walker.name || "Unknown",
            profilePic: app.walker.profilePic || "",
          },
          status: app.status,
          message: app.message,
        };
      })
      .filter((app) => app !== null);

    res.status(200).json({
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
        profilePic: job.owner.profilePic || "",
      },
      applications: validApplications,
      status: job.status,
    });
  } catch (error) {
    console.error("Get Job Error:", error);
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
};
