const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "walker"],
      required: true,
    },

    location: {
      type: String,
    },

    rating: {
      type: Number,
      default: 0,
    },

    profilePic: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
