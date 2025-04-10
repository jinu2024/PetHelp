const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Pet owner ID
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
    image: { type: String }, // Image URL (Cloudinary)
    pay: { type: Number, required: true },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
