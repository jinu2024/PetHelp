import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const R = 6371; // Earth radius in KM

// Haversine distance
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const useFilteredJobs = (userLat, userLng, maxDistance = 15) => { // Increased to 15 km
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/jobs/open?mode=all`
        );
        const jobs = res.data || [];
        console.log("API jobs:", jobs);

        // Filter by distance
        const nearbyJobs = jobs.filter((job) => {
          let jobLat, jobLng;

          // Try job.coordinates first
          if (job.coordinates && typeof job.coordinates.lat === "number" && typeof job.coordinates.lng === "number") {
            jobLat = job.coordinates.lat;
            jobLng = job.coordinates.lng;
          }
          // Fallback to job.geoLocation.coordinates
          else if (
            job.geoLocation &&
            Array.isArray(job.geoLocation.coordinates) &&
            job.geoLocation.coordinates.length === 2
          ) {
            [jobLng, jobLat] = job.geoLocation.coordinates;
          } else {
            console.log("Invalid job location:", job);
            return false;
          }

          const dist = getDistanceFromLatLonInKm(userLat, userLng, jobLat, jobLng);
          job.distanceInKm = dist.toFixed(1);
          console.log(`Job ${job.title}: ${dist} km`);
          return dist <= maxDistance;
        });

        setAllJobs(jobs);
        setFilteredJobs(nearbyJobs);
      } catch (err) {
        console.error("Error fetching jobs:", err);
        toast.error("Failed to load jobs.");
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    if (userLat != null && userLng != null) {
      console.log("Fetching jobs with lat:", userLat, "lng:", userLng);
      fetchJobs();
    } else {
      console.warn("No valid coordinates provided");
    }
  }, [userLat, userLng, maxDistance]);

  return { filteredJobs, allJobs, loading, error };
};

export default useFilteredJobs;