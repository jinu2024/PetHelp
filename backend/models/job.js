const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },

    // Keep original lat/lng if you want
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },

    // Add GeoJSON Point for spatial queries
    geoLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: true,
      },
    },

    image: { type: String },
    pay: { type: Number, required: true },
    applications: [{ type: mongoose.Schema.Types.ObjectId, ref: "Application" }],
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  { timestamps: true }
);

// Add 2dsphere index for geoLocation
jobSchema.index({ geoLocation: "2dsphere" });

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;
