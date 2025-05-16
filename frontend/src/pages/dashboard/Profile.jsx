import React, { useState, useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/userAtom";
import { myJobsState } from "../../recoil/MyJobAtom";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { UserCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

const Profile = () => {
  const { userId: paramUserId } = useParams();
  const location = useLocation();
  const [user, setUser] = useRecoilState(userAtom);
  const myJobs = useRecoilValue(myJobsState);
  const navigate = useNavigate();
  const [profileUser, setProfileUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    location: { coordinates: [0, 0], address: "" },
    profilePic: "",
    bio: "",
    role: "",
    rating: 0,
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const cloudinaryWidgetRef = useRef(null);

  // Fallback: Parse userId from URL if useParams fails
  const userId =
    paramUserId ||
    (location.pathname.match(/\/dashboard\/profile\/([^/]+)/)?.[1] ?? null);
  const isOwnProfile = userId === user.id || !userId;

  // Debug URL and params
  useEffect(() => {
    console.log("Profile.jsx - Current URL:", location.pathname);
    console.log("Profile.jsx - userId from useParams:", paramUserId);
    console.log("Profile.jsx - userId from URL parsing:", userId);
    console.log("Profile.jsx - Logged-in user.id:", user.id);
    console.log("Profile.jsx - isOwnProfile:", isOwnProfile);
  }, [location.pathname, paramUserId, userId, user.id, isOwnProfile]);

  // Cloudinary Upload Widget
  useEffect(() => {
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://widget.cloudinary.com/v2.0/global/all.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        let profileData;
        if (isOwnProfile) {
          profileData = user;
          console.log("Profile.jsx - Using userAtom for own profile:", profileData);
        } else {
          if (!userId) {
            throw new Error("Invalid user ID");
          }
          console.log("Profile.jsx - Fetching profile for userId:", userId);
          const res = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/${userId}`,
            { withCredentials: true }
          );
          profileData = { ...res.data, id: res.data._id || userId };
          console.log("Profile.jsx - Fetched profile data:", profileData);
        }

        // Validate user data
        if (!profileData._id && !profileData.id) {
          throw new Error("User not found");
        }

        setProfileUser(profileData);
        setFormData({
          name: profileData.name || "",
          email: profileData.email || "",
          location: {
            coordinates: profileData.location?.coordinates || [0, 0],
            address: profileData.location?.address || "",
          },
          profilePic: profileData.profilePic || "",
          bio: profileData.bio || "",
          role: profileData.role || "",
          rating: profileData.rating || 0,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        if (error.message !== "Request failed with status code 403") {
          toast.error(error.response?.data?.message || "Failed to load profile");
        }
        setProfileUser(error.response?.status === 404 ? null : profileData);
      }
    };

    if (user.id || userId) {
      fetchProfile();
    }
  }, [userId, user.id, isOwnProfile]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "address") {
      setFormData((prev) => ({
        ...prev,
        location: { ...prev.location, address: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Cloudinary Upload
  const handleUploadProfilePic = () => {
    if (window.cloudinary && !cloudinaryWidgetRef.current) {
      cloudinaryWidgetRef.current = window.cloudinary.createUploadWidget(
        {
          cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
          uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
          sources: ["local", "url", "camera"],
          multiple: false,
          resourceType: "image",
          clientAllowedFormats: ["jpg", "png", "jpeg"],
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            setFormData((prev) => ({
              ...prev,
              profilePic: result.info.secure_url,
            }));
            toast.success("Profile picture uploaded successfully");
          } else if (error) {
            console.error("Cloudinary upload error:", error);
            toast.error("Failed to upload profile picture");
          }
        }
      );
    }
    cloudinaryWidgetRef.current?.open();
  };

  // Fetch current location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const address = res.data.display_name || "";
          setFormData((prev) => ({
            ...prev,
            location: { coordinates: [longitude, latitude], address },
          }));
          toast.success("Location fetched successfully");
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          setFormData((prev) => ({
            ...prev,
            location: { coordinates: [longitude, latitude], address: "" },
          }));
          toast.success("Coordinates fetched, address unavailable");
        } finally {
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to fetch location. Please allow location access.");
        setLocationLoading(false);
      }
    );
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      location: {
        type: "Point",
        coordinates: formData.location.coordinates,
        address: formData.location.address,
      },
      profilePic: formData.profilePic,
      bio: formData.bio,
    };
    try {
      console.log("Profile.jsx - Updating profile with payload:", payload);
      const res = await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/update-profile`,
        payload,
        { withCredentials: true }
      );
      const updatedUser = {
        ...user,
        id: res.data.user._id || user.id,
        name: res.data.user.name,
        email: res.data.user.email,
        location: res.data.user.location,
        profilePic: res.data.user.profilePic || "",
        bio: res.data.user.bio || "",
        role: res.data.user.role,
        rating: res.data.user.rating || 0,
      };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success(res.data.message);
      setIsEditing(false);
      console.log("Profile.jsx - Profile updated successfully:", updatedUser);
    } catch (error) {
      console.error("Profile.jsx - Error updating profile:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  // Toggle edit mode
  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setFormData({
        name: profileUser.name || "",
        email: profileUser.email || "",
        location: {
          coordinates: profileUser.location?.coordinates || [0, 0],
          address: profileUser.location?.address || "",
        },
        profilePic: profileUser.profilePic || "",
        bio: profileUser.bio || "",
        role: profileUser.role || "",
        rating: profileUser.rating || 0,
      });
    }
  };

  // Handle send message
  const handleSendMessage = () => {
    if (!profileUser?.id && !profileUser?._id) {
      toast.error("Cannot send message: User not found");
      return;
    }
    navigate(`/dashboard/messages?recipient=${profileUser.id || profileUser._id}`);
  };

  // Show loading or login prompt
  if (!user.id && !userId) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <p className="text-gray-600 text-sm sm:text-base">
          Please log in to view profiles.
        </p>
        <Link
          to="/login"
          className="mt-4 inline-block bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
        >
          Log In
        </Link>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <p className="text-gray-600 text-sm sm:text-base">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center mb-6">
        {!isOwnProfile && (
          <button
            onClick={() => navigate(-1)}
            className="mr-3 text-purple-600 hover:text-purple-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        )}
        <h2 className="text-2xl sm:text-3xl font-bold text-center flex-1">
          {isOwnProfile ? "My Profile" : `${profileUser.name}'s Profile`}
        </h2>
      </div>
      <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6">
        {isOwnProfile && isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                {formData.profilePic ? (
                  <img
                    src={formData.profilePic}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <UserCircleIcon className="w-20 h-20 text-gray-400" />
                )}
              </div>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={handleUploadProfilePic}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
              >
                Upload Profile Picture
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                name="address"
                value={formData.location.address}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., 123 Main St, Bhopal, India"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className={`mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors ${
                  locationLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {locationLoading ? "Fetching Location..." : "Use Current Location"}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows="4"
                placeholder="Tell us about yourself (e.g., I love helping with pet care!)"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={toggleEdit}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm sm:text-base transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                {profileUser.profilePic ? (
                  <img
                    src={profileUser.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.target.style.display = "none")}
                  />
                ) : (
                  <UserCircleIcon className="w-20 h-20 sm:w-24 sm:h-24 text-gray-400" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-gray-900 text-sm sm:text-base truncate">{formData.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Role</p>
                <p className="text-gray-900 text-sm sm:text-base">{formData.role || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900 text-sm sm:text-base truncate">{formData.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Location</p>
                <p className="text-gray-900 text-sm sm:text-base truncate">
                  {formData.location.address ||
                    (formData.location.coordinates[0] !== 0 && formData.location.coordinates[1] !== 0
                      ? `Lon: ${formData.location.coordinates[0].toFixed(4)}, Lat: ${formData.location.coordinates[1].toFixed(4)}`
                      : "N/A")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Rating</p>
                <p className="text-gray-900 text-sm sm:text-base">{formData.rating || 0} / 5</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Bio</p>
              <p className="text-gray-900 text-sm sm:text-base">{formData.bio || "No bio provided"}</p>
            </div>
            {isOwnProfile && formData.role === "owner" && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Job Listings</p>
                {myJobs.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {myJobs.slice(0, 5).map((job) => (
                      <div key={job._id} className="border p-3 rounded-lg bg-gray-50">
                        <p className="text-sm font-semibold truncate">{job.title || "Untitled Job"}</p>
                        <p className="text-sm text-gray-600">Pay: ₹{job.pay || "N/A"}</p>
                        <Link
                          to={`/dashboard/job/${job._id}`}
                          className="text-purple-600 hover:text-purple-700 text-sm"
                        >
                          View Job
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm sm:text-base">
                    No jobs posted yet.{" "}
                    <Link
                      to="/dashboard/my-jobs"
                      className="text-purple-600 hover:text-purple-700"
                    >
                      Create a job
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={toggleEdit}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
                  >
                    Edit Profile
                  </button>
                  {formData.role === "owner" && (
                    <Link
                      to="/dashboard/my-jobs"
                      className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm sm:text-base transition-colors"
                    >
                      My Job Listings
                    </Link>
                  )}
                </>
              ) : (
                user.id && (
                  <button
                    onClick={handleSendMessage}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
                  >
                    Send Message
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;