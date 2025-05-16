import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/userAtom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const CurrentJobs = () => {
  const user = useRecoilValue(userAtom);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user.role !== "walker") {
      toast.error("Only walkers can view current jobs");
      return;
    }

    const fetchJobs = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/jobs/walker`, {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        });
        setJobs(res.data);
      } catch (error) {
        console.error("Fetch jobs error:", error.response?.data, error.response?.status);
        toast.error(error.response?.data?.message || "Failed to load jobs");
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [user.role]);

  if (user.role !== "walker") {
    return <div className="text-center p-4 sm:p-6 text-gray-600 text-sm sm:text-base">Access restricted to walkers.</div>;
  }

  if (loading) {
    return <div className="text-center p-4 sm:p-6 text-gray-600 text-sm sm:text-base">Loading current jobs...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold mb-4">Your Current Jobs</h2>
      {jobs.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">No assigned or completed jobs.</p>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Link
              to={`/dashboard/job/${job._id}`}
              key={job._id}
              className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                <img
                  src={job.image || "https://res.cloudinary.com/demo/image/upload/v1699999999/default-job-image.png"}
                  alt={job.title}
                  className="w-full sm:w-32 h-32 object-contain rounded"
                />
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold truncate">{job.title}</h3>
                  <p className="text-gray-600 text-sm sm:text-base truncate">{job.description}</p>
                  <p className="text-sm sm:text-base"><strong>Pay:</strong> ₹{job.pay}</p>
                  <p className="text-sm sm:text-base"><strong>Location:</strong> {job.location}</p>
                  <p className="text-sm sm:text-base"><strong>Owner:</strong> {job.owner.name}</p>
                  <p className="text-sm sm:text-base">
                    <strong>Status:</strong>{" "}
                    <span
                      className={`${
                        job.status === "assigned" ? "text-green-600" : "text-blue-600"
                      } font-semibold`}
                    >
                      {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default CurrentJobs;