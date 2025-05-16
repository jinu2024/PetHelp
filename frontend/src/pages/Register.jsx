import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../recoil/userAtom";

function Register() {
  const navigate = useNavigate();
  const setUser = useSetRecoilState(userAtom);
  const user = useRecoilValue(userAtom);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "owner",
    location: "",
    lat: null,
    lng: null,
    profilePic: "", // Added to match User model
    bio: "", // Added to match User model
  });

  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user && user.id) navigate("/dashboard"); // Added null check for user
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    if (e.target.name === "location" && e.target.value.length > 2) {
      fetchSuggestions(e.target.value);
    }
  };

  const fetchSuggestions = async (query) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: {
          q: query,
          format: "json",
          addressdetails: 1,
          limit: 5,
        },
      });
      setSuggestions(res.data);
    } catch (err) {
      console.error("Failed to fetch suggestions", err);
      toast.error("Failed to fetch location suggestions.");
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      location: suggestion.display_name,
      lat: parseFloat(suggestion.lat),
      lng: parseFloat(suggestion.lon),
    }));
    setSuggestions([]);
  };

  const handleUseCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
            params: {
              lat: latitude,
              lon: longitude,
              format: "json",
            },
          });
          setFormData((prev) => ({
            ...prev,
            location: res.data.display_name,
            lat: latitude,
            lng: longitude,
          }));
        } catch (err) {
          toast.error("Failed to reverse geocode location.");
        }
      },
      (error) => {
        toast.error("Unable to get your current location.");
      }
    );
  };

  const validate = () => {
    if (!formData.name || !formData.email || !formData.password || !formData.location || !formData.lat || !formData.lng) {
      toast.error("Please fill all fields and choose a valid location.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        location: {
          type: "Point",
          coordinates: [formData.lng, formData.lat], // Matches User model
          address: formData.location,
        },
        profilePic: formData.profilePic, // Added
        bio: formData.bio, // Added
      });
      toast.success("Registration successful!");
      setUser({
        id: res.data.user._id, // Use _id from MongoDB
        name: res.data.user.name,
        email: res.data.user.email,
        role: res.data.user.role,
        location: res.data.user.location,
        profilePic: res.data.user.profilePic || "",
        bio: res.data.user.bio || "",
        rating: res.data.user.rating || 0,
        loading: false,
      });
      console.log("Registered userAtom:", res.data.user);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-200 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"
      >
        <h2 className="text-3xl font-bold text-center text-purple-700 mb-6">
          Create an Account 🐾
        </h2>

        <div className="space-y-4">
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            name="name"
            type="text"
            placeholder="Name"
            onChange={handleChange}
            required
          />

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <div className="relative">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <span
              className="absolute right-3 top-2.5 text-sm text-purple-600 cursor-pointer select-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <select
            name="role"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="owner">Pet Owner</option>
            <option value="walker">Pet Walker</option>
          </select>

          <div className="relative">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              name="location"
              type="text"
              placeholder="Search your location"
              value={formData.location}
              onChange={handleChange}
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-10 bg-white w-full border border-gray-200 max-h-40 overflow-y-auto shadow-md rounded-md mt-1">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-purple-100 cursor-pointer text-sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.display_name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            className="text-sm text-purple-600 hover:underline"
            onClick={handleUseCurrentLocation}
          >
            📍 Use Current Location
          </button>
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-md mt-6 transition duration-300"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-600 hover:underline font-medium">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;