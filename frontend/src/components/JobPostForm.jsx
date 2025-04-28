import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet marker icon path
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const JobPostForm = () => {
  const jobOptions = [
    "Pet Walker",
    "Pet Groomer",
    "Pet Sitter",
    "Vet Assistant",
    "Other",
  ];

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    pay: "",
  });

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [coords, setCoords] = useState(null);

  const handleLocationChange = async (e) => {
    const query = e.target.value;
    setFormData((prev) => ({ ...prev, location: query }));

    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: query,
            format: "json",
            addressdetails: 1,
            limit: 5,
            countrycodes: "in",
          },
        }
      );

      setSuggestions(res.data);
    } catch (err) {
      console.error("Autocomplete failed", err);
    }
  };

  const handleSuggestionSelect = (place) => {
    setFormData((prev) => ({
      ...prev,
      location: place.display_name,
    }));
    setCoords({ lat: parseFloat(place.lat), lng: parseFloat(place.lon) });
    setSuggestions([]);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        const res = await axios.get(
          "https://nominatim.openstreetmap.org/reverse",
          {
            params: {
              lat: latitude,
              lon: longitude,
              format: "json",
            },
          }
        );

        setFormData((prev) => ({
          ...prev,
          location: res.data.display_name || "Current Location",
        }));
      },
      (err) => {
        toast.error("Unable to fetch location.");
        console.error(err);
      }
    );
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    if (!formData.title || formData.title.trim() === "") {
      toast.error("Please enter a valid job title.");
      return false;
    }
    if (!formData.description || formData.description.trim() === "") {
      toast.error("Please enter a job description.");
      return false;
    }
    if (!formData.location || formData.location.trim() === "") {
      toast.error("Please enter or select a location.");
      return false;
    }
    if (!formData.pay || isNaN(formData.pay) || Number(formData.pay) <= 0) {
      toast.error("Please enter a valid pay amount.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;
    setUploading(true);

    try {
      const jobRes = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/jobs/post`,
        {
          title: formData.title,
          description: formData.description,
          location: formData.location,
          pay: formData.pay,
          coordinates: coords,
        },
        { withCredentials: true }
      );

      const jobId = jobRes.data.job._id;
    

      if (image) {
        const cloudinaryData = new FormData();
        cloudinaryData.append("file", image);
        cloudinaryData.append("upload_preset", "PetHelp");

        const cloudRes = await axios.post(
          `https://api.cloudinary.com/v1_1/${
            import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
          }/image/upload`,
          cloudinaryData
        );

        const imageUrl = cloudRes.data.secure_url;

        await axios.put(
          `${import.meta.env.VITE_BACKEND_URL}/api/jobs/update-image/${jobId}`,
          { image: imageUrl },
          { withCredentials: true }
        );
      }

      toast.success("Job posted successfully!");
      setFormData({ title: "", description: "", location: "", pay: "" });
      setImage(null);
      setImagePreview(null);
      setCoords(null);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Something went wrong. Try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const isCustomTitle = formData.title && !jobOptions.includes(formData.title);

  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded shadow-md">
      <h2 className="text-xl font-bold mb-4">Post a New Job</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Job Title Dropdown + Optional Custom Title */}
        <div>
          <select
            value={
              jobOptions.includes(formData.title) ? formData.title : "Other"
            }
            onChange={(e) => {
              const value = e.target.value;
              setFormData((prev) => ({
                ...prev,
                title: value === "Other" ? "" : value,
              }));
            }}
            className="w-full p-2 border rounded"
            required
          >
            <option value="" disabled>
              Select Job Title
            </option>
            {jobOptions.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>

          {formData.title === "" && (
            <input
              type="text"
              name="title"
              placeholder="Enter Custom Title"
              value={formData.title}
              onChange={handleChange}
              className="w-full p-2 border rounded mt-2"
              required
            />
          )}
        </div>

        {/* Description */}
        <textarea
          name="description"
          placeholder="Job Description"
          value={formData.description}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />

        {/* Location Input + Suggestions */}
        <div className="relative">
          <input
            type="text"
            name="location"
            placeholder="Job Location"
            value={formData.location}
            onChange={handleLocationChange}
            required
            className="w-full p-2 border rounded"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-10 bg-white border rounded w-full max-h-40 overflow-y-auto mt-1">
              {suggestions.map((place, idx) => (
                <li
                  key={idx}
                  className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleSuggestionSelect(place)}
                >
                  {place.display_name}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={handleUseMyLocation}
            className="text-sm text-blue-600 mt-2 underline"
          >
            📍 Use my current location
          </button>
        </div>

        {/* Map */}
        {coords && (
          <div className="mt-3 h-40 rounded-md overflow-hidden border border-gray-300">
            <MapContainer
              center={[coords.lat, coords.lng]}
              zoom={13}
              className="h-full w-full"
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={[coords.lat, coords.lng]}>
                <Popup>{formData.location}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        {/* Pay */}
        <input
          type="number"
          name="pay"
          placeholder="Pay Offered"
          value={formData.pay}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded"
        />

        {/* Image Upload */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full p-2 border rounded"
        />

        {/* Image Preview */}
        {imagePreview && (
          <div className="flex items-start">
            <div className="rounded overflow-hidden mr-3">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-24 h-24 object-contain"
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : "Post Job"}
        </button>
      </form>
    </div>
  );
};

export default JobPostForm;
