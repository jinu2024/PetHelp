import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/userAtom";
import useFilteredJobs from "../hooks/useFilteredJobs";
import { toast } from "react-toastify";
import axios from "axios";
import JobCard from "./JobCard";

const BrowseJobs = () => {
  const user = useRecoilValue(userAtom);
  const [coords, setCoords] = useState({ lat: null, lng: null });
  const [filters, setFilters] = useState({
    distance: 15,
    minPay: 0,
    maxPay: Infinity,
    postedWithin: null,
    search: "",
    category: "",
    type: "",
  });
  const { filteredJobs, loading } = useFilteredJobs(coords.lat, coords.lng, filters.distance);

  useEffect(() => {
    let lat = null, lng = null;
    if (user?.location?.coordinates && Array.isArray(user.location.coordinates) && user.location.coordinates.length === 2) {
      [lng, lat] = user.location.coordinates;
    } else {
      lat = localStorage.getItem("lat");
      lng = localStorage.getItem("lng");
    }
    if (lat && lng) {
      setCoords({ lat: parseFloat(lat), lng: parseFloat(lng) });
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords({ lat: latitude, lng: longitude });
          localStorage.setItem("lat", latitude);
          localStorage.setItem("lng", longitude);
        },
        () => {
          toast.error("Location permission denied. Using default location.");
          setCoords({ lat: 12.9716, lng: 77.5946 });
        }
      );
    }
  }, [user]);

  const handleApply = async (jobId) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/apply`,
        { jobId },
        { withCredentials: true }
      );
      toast.success("Assigned successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply");
    }
  };

  const applyAllFilters = () => {
    return filteredJobs.filter((job) => {
      if (job.status !== "open") return false;
      const pay = parseFloat(job.pay) || 0;
      const withinPay = pay >= filters.minPay && pay <= filters.maxPay;
      let withinDate = true;
      if (filters.postedWithin) {
        const postedDate = new Date(job.createdAt);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - filters.postedWithin);
        withinDate = postedDate >= threshold;
      }
      const matchesSearch = job.title?.toLowerCase().includes(filters.search.toLowerCase());
      const matchesCategory = !filters.category || (job.category || "").toLowerCase() === filters.category.toLowerCase();
      const matchesType = !filters.type || (job.type || "").toLowerCase() === filters.type.toLowerCase();
      return withinPay && withinDate && matchesSearch && matchesCategory && matchesType;
    });
  };

  const finalJobs = applyAllFilters();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Browse Jobs</h2>
      {/* Filters Section (unchanged) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        {/* ... existing filter inputs ... */}
      </div>
      <input
        type="text"
        className="border p-2 rounded w-full mb-6 text-sm sm:text-base"
        placeholder="Search job title..."
        value={filters.search}
        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {finalJobs.length > 0 ? (
          finalJobs.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              role={user?.role || "walker"}
              onApply={handleApply}
              application={null} // No applications
            />
          ))
        ) : (
          <p className="text-center col-span-full text-gray-500 text-sm sm:text-base">
            No jobs found for selected filters.
          </p>
        )}
      </div>
      {loading && (
        <p className="text-center mt-4 text-gray-500 text-sm sm:text-base">Loading...</p>
      )}
    </div>
  );
};

export default BrowseJobs;