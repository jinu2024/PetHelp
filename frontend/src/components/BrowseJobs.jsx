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
  const [applications, setApplications] = useState([]);
  const { filteredJobs, allJobs, loading } = useFilteredJobs(
    coords.lat,
    coords.lng,
    filters.distance
  );

  // Fetch walker's applications
  const fetchApplications = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/my-applications`,
        { withCredentials: true }
      );
      console.log("Fetched applications:", res.data);
      setApplications(res.data);
    } catch (error) {
      console.error("Error fetching applications:", error.response?.data || error);
      toast.error("Failed to load application status");
    }
  };

  useEffect(() => {
    if (user?.role === "walker") {
      fetchApplications();
    }
  }, [user?.role]);

  // Set coordinates from user or localStorage or get current location
  useEffect(() => {
    let lat = null,
      lng = null;
    if (
      user?.location?.coordinates &&
      Array.isArray(user.location.coordinates) &&
      user.location.coordinates.length === 2
    ) {
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
        (err) => {
          toast.error("Location permission denied. Using default location.");
          setCoords({ lat: 12.9716, lng: 77.5946 });
        }
      );
    }
  }, [user]);

  // Handle applying to a job
  const handleApply = async (jobId) => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/apply`,
        { jobId },
        { withCredentials: true }
      );
      toast.success("Applied successfully!");
      // Refresh applications to ensure UI updates
      await fetchApplications();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to apply");
      console.error("Apply error:", err.response?.data || err);
    }
  };

  // Filter logic for pay range, date, type, etc.
  const applyAllFilters = () => {
    return filteredJobs.filter((job) => {
      const pay = parseFloat(job.pay) || 0;
      const withinPay = pay >= filters.minPay && pay <= filters.maxPay;

      let withinDate = true;
      if (filters.postedWithin) {
        const postedDate = new Date(job.createdAt);
        const threshold = new Date();
        threshold.setDate(threshold.getDate() - filters.postedWithin);
        withinDate = postedDate >= threshold;
      }

      const matchesSearch = job.title
        ?.toLowerCase()
        .includes(filters.search.toLowerCase());

      const matchesCategory =
        !filters.category ||
        (job.category || "").toLowerCase() === filters.category.toLowerCase();

      const matchesType =
        !filters.type ||
        (job.type || "").toLowerCase() === filters.type.toLowerCase();

      return (
        withinPay && withinDate && matchesSearch && matchesCategory && matchesType
      );
    });
  };

  const finalJobs = applyAllFilters();

  console.log("Final jobs:", finalJobs);
  console.log("Applications in BrowseJobs:", applications);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Browse Jobs</h2>

      {/* Filters Section */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
        <select
          className="border p-2 rounded text-sm sm:text-base"
          value={filters.distance}
          onChange={(e) =>
            setFilters((f) => ({ ...f, distance: parseFloat(e.target.value) }))
          }
        >
          <option value={1}>Less than 1km</option>
          <option value={3}>Less than 3km</option>
          <option value={5}>Less than 5km</option>
          <option value={10}>Less than 10km</option>
          <option value={15}>Less than 15km</option>
          <option value={50}>Less than 50km</option>
        </select>

        <input
          type="number"
          className="border p-2 rounded text-sm sm:text-base"
          placeholder="Min Pay"
          value={filters.minPay}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              minPay: parseInt(e.target.value) || 0,
            }))
          }
        />

        <input
          type="number"
          className="border p-2 rounded text-sm sm:text-base"
          placeholder="Max Pay"
          value={filters.maxPay === Infinity ? "" : filters.maxPay}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              maxPay: parseInt(e.target.value) || Infinity,
            }))
          }
        />

        <select
          className="border p-2 rounded text-sm sm:text-base"
          value={filters.postedWithin || ""}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              postedWithin: parseInt(e.target.value) || null,
            }))
          }
        >
          <option value="">All Time</option>
          <option value={1}>Last 24 hours</option>
          <option value={3}>Last 3 days</option>
          <option value={7}>Last 7 days</option>
        </select>

        <select
          className="border p-2 rounded text-sm sm:text-base"
          value={filters.category}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              category: e.target.value,
            }))
          }
        >
          <option value="">All Categories</option>
          <option value="Delivery">Delivery</option>
          <option value="Housekeeping">Housekeeping</option>
          <option value="Tutoring">Tutoring</option>
        </select>

        <select
          className="border p-2 rounded text-sm sm:text-base"
          value={filters.type}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              type: e.target.value,
            }))
          }
        >
          <option value="">All Types</option>
          <option value="Part-time">Part-time</option>
          <option value="Full-time">Full-time</option>
          <option value="Contract">Contract</option>
        </select>
      </div>

      <input
        type="text"
        className="border p-2 rounded w-full mb-6 text-sm sm:text-base"
        placeholder="Search job title..."
        value={filters.search}
        onChange={(e) =>
          setFilters((f) => ({ ...f, search: e.target.value }))
        }
      />

      {/* Jobs Display Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {finalJobs.length > 0 ? (
          finalJobs.map((job) => {
            const application = applications.find(
              (app) => app.job?._id?.toString() === job._id?.toString()
            );
            console.log(`Job ${job._id}: Application found -`, application);
            return (
              <JobCard
                key={job._id}
                job={job}
                role={user?.role || "walker"}
                onApply={handleApply}
                application={application}
              />
            );
          })
        ) : (
          <p className="text-center col-span-full text-gray-500 text-sm sm:text-base">
            No jobs found for selected filters.
          </p>
        )}
      </div>

      {loading && (
        <p className="text-center mt-4 text-gray-500 text-sm sm:text-base">
          Loading...
        </p>
      )}
    </div>
  );
};

export default BrowseJobs;