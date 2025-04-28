import React, { useState, useEffect, useRef } from "react";
import { useRecoilState } from "recoil";
import { userAtom } from "../../recoil/userAtom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { UserCircleIcon } from "@heroicons/react/24/outline";

const Profile = () => {
  const [user, setUser] = useRecoilState(userAtom);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || "",
    email: user.email || "",
    location: {
      coordinates: user.location?.coordinates || [0, 0],
      address: user.location?.address || "",
    },
    profilePic: user.profilePic || "",
    bio: user.bio || "",
  });
  const [locationLoading, setLocationLoading] = useState(false);
  const cloudinaryWidgetRef = useRef(null);

  // Log userAtom for debugging
  console.log("User from userAtom in Profile:", user);

  // Initialize Cloudinary Upload Widget
  useEffect(() => {
    if (!window.cloudinary) {
      const script = document.createElement("script");
      script.src = "https://widget.cloudinary.com/v2.0/global/all.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

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

  // Open Cloudinary Upload Widget
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
            console.log("Cloudinary URL:", result.info.secure_url);
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
            location: {
              coordinates: [longitude, latitude],
              address,
            },
          }));
          toast.success("Location fetched successfully");
        } catch (error) {
          console.error("Error reverse geocoding:", error);
          setFormData((prev) => ({
            ...prev,
            location: {
              ...prev.location,
              coordinates: [longitude, latitude],
            },
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
    console.log("Submitting profile update:", payload);
    try {
      const res = await axios.patch(
        `${import.meta.env.VITE_BACKEND_URL}/api/user/update-profile`,
        payload,
        { withCredentials: true }
      );

      setUser((prev) => {
        const updatedUser = {
          ...prev,
          name: res.data.user.name,
          email: res.data.user.email,
          location: res.data.user.location,
          profilePic: res.data.user.profilePic || "",
          bio: res.data.user.bio || "",
          rating: res.data.user.rating || 0,
        };
        console.log("Updated userAtom:", updatedUser);
        return updatedUser;
      });
      toast.success(res.data.message);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    }
  };

  // Toggle edit mode
  const toggleEdit = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        location: {
          coordinates: user.location?.coordinates || [0, 0],
          address: user.location?.address || "",
        },
        profilePic: user.profilePic || "",
        bio: user.bio || "",
      });
    }
  };

  // Show loading or login prompt if userAtom is not populated
  if (!user.id) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <p className="text-gray-600">
          {user.loading
            ? "Loading profile..."
            : "Please log in to view your profile."}
        </p>
        {!user.loading && (
          <Link
            to="/login"
            className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Log In
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">My Profile</h2>
      <div className="bg-white shadow rounded-lg p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                {formData.profilePic ? (
                  <img
                    src={formData.profilePic}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image load error:", formData.profilePic);
                      e.target.style.display = "none";
                    }}
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Upload Profile Picture
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border p-2 rounded text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 block w-full border p-2 rounded text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.location.address}
                onChange={handleChange}
                className="mt-1 block w-full border p-2 rounded text-sm"
                placeholder="e.g., 123 Main St, Bangalore, India"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={locationLoading}
                className={`mt-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm ${
                  locationLoading ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {locationLoading ? "Fetching Location..." : "Use Current Location"}
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="mt-1 block w-full border p-2 rounded text-sm"
                rows="4"
                placeholder="Tell us about yourself (e.g., I love walking dogs!)"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={toggleEdit}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full border-2 border-gray-200 flex items-center justify-center overflow-hidden">
                {user.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error("Image load error:", user.profilePic);
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <UserCircleIcon className="w-20 h-20 text-gray-400" />
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Name</p>
                <p className="text-gray-900">{formData.name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-900">{formData.email || "N/A"}</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-gray-900">{user.role || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Location</p>
              <p className="text-gray-900">
                {formData.location.address ||
                  (formData.location.coordinates
                    ? `Longitude: ${formData.location.coordinates[0].toFixed(
                        4
                      )}, Latitude: ${formData.location.coordinates[1].toFixed(4)}`
                    : "N/A")}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Rating</p>
              <p className="text-gray-900">{user.rating || 0} / 5</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Bio</p>
              <p className="text-gray-900">{formData.bio || "No bio provided"}</p>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={toggleEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Edit Profile
              </button>
              <Link
                to={
                  user.role === "walker"
                    ? "/dashboard/my-applications"
                    : "/dashboard/my-job-listings"
                }
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded text-sm"
              >
                {user.role === "walker" ? "My Applications" : "My Job Listings"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;