const Application = require("../models/application");
const Job = require("../models/job");

// Apply for a job (Only Walkers)
const applyForJob = async (req, res) => {
  try {
    if (req.user.role !== "walker") {
      return res.status(403).json({ message: "Only walkers can apply for jobs" });
    }

    const { jobId, message } = req.body;

    const existing = await Application.findOne({
      job: jobId,
      walker: req.user._id,
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "You have already applied to this job" });
    }

    const newApplication = new Application({
      job: jobId,
      walker: req.user._id, // ✅ Fixed here too
      message,
    });

    await newApplication.save();

    // Add application reference to Job
    await Job.findByIdAndUpdate(jobId, {
      $push: { applications: newApplication._id },
    });

    res.status(201).json({
      message: "Application submitted successfully",
      application: newApplication,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



// Get applications for a specific walker
const getMyApplications = async (req, res) => {
  try {
    if (req.user.role !== "walker") {
      return res
        .status(403)
        .json({ message: "Only walkers can view their applications" });
    }

    const applications = await Application.find({
      walker: req.user._id,
    }).populate("job", "title location");
    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// Accept or Reject an Application (Only Pet Owners)
const updateApplicationStatus = async (req, res) => {
  try {
    if (req.user.role !== "owner") {
      return res
        .status(403)
        .json({ message: "Only pet owners can update applications" });
    }

    const { applicationId, status } = req.body;
    if (!["accepted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const application = await Application.findById(applicationId).populate(
      "job"
    );
    if (!application)
      return res.status(404).json({ message: "Application not found" });

    if (application.job.owner.toString() !== req.user._id) {
      return res
        .status(403)
        .json({ message: "You can only update applications for your jobs" });
    }

    application.status = status;
    await application.save();

    res.json({ message: "Application updated successfully", application });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};



module.exports = { applyForJob, getMyApplications, updateApplicationStatus };
