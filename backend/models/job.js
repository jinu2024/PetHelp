const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    location: { type: String, required: true },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
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
    assignedWalker: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    assignmentTimestamp: { type: Date, default: null },
    onMyWay: { type: Boolean, default: false },
    walkerPosition: {
      type: [Number], // [lat, lng]
      index: "2dsphere",
      default: null,
    },
    status: {
      type: String,
      enum: ["open", "assigned", "canceled", "closed"],
      default: "open",
    },
  },
  { timestamps: true }
);

jobSchema.index({ geoLocation: "2dsphere" });
jobSchema.index({ walkerPosition: "2dsphere" });

const Job = mongoose.model("Job", jobSchema);
module.exports = Job;