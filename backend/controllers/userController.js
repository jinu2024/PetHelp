const User = require("../models/user");

const updateProfile = async (req, res) => {
  try {
    const { bio, location } = req.body;
    const profilePic = req.file?.path;

    const updates = { bio, location };
    if (profilePic) updates.profilePic = profilePic;

    const updatedUser = await User.findByIdAndUpdate(req.user.userId, updates, { new: true });

    res.json({
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        profilePic: updatedUser.profilePic,
        bio: updatedUser.bio,
        location: updatedUser.location,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

module.exports = { updateProfile };
