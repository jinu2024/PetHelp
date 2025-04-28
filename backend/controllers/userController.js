const axios = require("axios");
const cloudinary = require("cloudinary").v2;
const User = require("../models/user");

const updateProfile = async (req, res) => {
  try {
    const { name, email, bio, location, profilePic } = req.body;

    // Validate req.user.userId
    if (!req.user?._id) {
      return res.status(401).json({ message: "Unauthorized: Missing user ID" });
    }

    // Log for debugging
    console.log("req.body.profilePic:", profilePic);

    // Prepare updates
    let updates = {
      name,
      email,
      bio,
      location: {
        type: "Point",
        coordinates: location?.coordinates || [0, 0],
        address: location?.address || "",
      },
    };

    // Handle profilePic update and Cloudinary deletion
    if (profilePic) {
      // Basic URL validation (optional)
      if (!profilePic.startsWith("https://res.cloudinary.com")) {
        return res.status(400).json({ message: "Invalid profile picture URL" });
      }
      updates.profilePic = profilePic;
      // Get current user to check old profilePic
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.profilePic && user.profilePic !== profilePic) {
        // Extract public_id from old Cloudinary URL
        const publicId = user.profilePic.split("/").pop().split(".")[0]; // e.g., "txoiqgch1azb4vydqdnl"
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log(`Deleted old Cloudinary image: ${publicId}`);
        } catch (error) {
          console.error("Error deleting old Cloudinary image:", error);
          // Continue with update even if deletion fails
        }
      }
    }

    // Geocode address if provided and changed
    if (location?.address) {
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.location.address !== location.address) {
        try {
          const response = await axios.get(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              location.address
            )}`
          );
          if (response.data.length > 0) {
            const { lon, lat } = response.data[0];
            updates.location.coordinates = [parseFloat(lon), parseFloat(lat)];
          } else {
            return res.status(400).json({ message: "Invalid address" });
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          return res.status(400).json({ message: "Unable to geocode address" });
        }
      } else {
        updates.location.coordinates = user.location.coordinates;
      }
    }

    // Log updates for debugging
    console.log("Updates:", updates);

    // Update user
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    console.log("Updated user profile:", updatedUser);

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic || "",
        bio: updatedUser.bio || "",
        location: updatedUser.location,
        role: updatedUser.role,
        rating: updatedUser.rating || 0,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(400).json({ message: "Invalid input", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("name profilePic");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({
      _id: user._id,
      name: user.name,
      profilePic: user.profilePic || "",
    });
  } catch (error) {
    console.error("Get User Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { updateProfile, getUserById };