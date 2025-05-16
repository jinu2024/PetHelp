import React, { useEffect, useState } from "react";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { myJobsState } from "../../recoil/MyJobAtom";
import { userAtom } from "../../recoil/userAtom";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import io from "socket.io-client";

const AssignedJobs = () => {
  const user = useRecoilValue(userAtom);
  const myJobs = useRecoilValue(myJobsState);
  const setMyJobs = useSetRecoilState(myJobsState);
  const navigate = useNavigate();
  const [jobMetrics, setJobMetrics] = useState({}); // { jobId: { distance, eta } }

  // Filter assigned jobs
  const assignedJobs = myJobs.filter((job) => job.status === "assigned");

  // Throttle function
  const throttle = (func, limit) => {
    let inThrottle;
    return (...args) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  };

  // Fetch distance and ETA for onMyWay jobs
  const fetchRouteData = async (jobId, walkerPos, jobPos) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/walking/${walkerPos[1]},${walkerPos[0]};${jobPos[1]},${jobPos[0]}?overview=false`;
      const res = await axios.get(url);
      const route = res.data.routes[0];
      setJobMetrics((prev) => ({
        ...prev,
        [jobId]: {
          distance: (route.distance / 1000).toFixed(2), // km
          eta: Math.ceil(route.duration / 60), // minutes
        },
      }));
      console.log(`AssignedJobs.jsx - Route data for job ${jobId}:`, { distance: route.distance, eta: route.duration });
    } catch (error) {
      console.error(`AssignedJobs.jsx - OSRM error for job ${jobId}:`, error);
      setJobMetrics((prev) => ({
        ...prev,
        [jobId]: { distance: null, eta: null },
      }));
    }
  };

  // Poll walker position and fetch metrics for onMyWay jobs
  useEffect(() => {
    const updateMetrics = throttle(() => {
      assignedJobs.forEach((job) => {
        if (job.onMyWay && job.walkerPosition && job.geoLocation?.coordinates) {
          const walkerPos = job.walkerPosition;
          const jobPos = [job.geoLocation.coordinates[1], job.geoLocation.coordinates[0]];
          fetchRouteData(job._id, walkerPos, jobPos);
        }
      });
    }, 5000); // Throttle to 5s

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000);

    return () => clearInterval(interval);
  }, [assignedJobs]);

  // Socket.io for real-time updates
  useEffect(() => {
    if (user?.id && user.role === "owner") {
      const socket = io(import.meta.env.VITE_BACKEND_URL, {
        withCredentials: true,
        query: { userId: user.id },
      });

      socket.on("connect", () => console.log(`AssignedJobs.jsx - Socket connected: ${socket.id}`));
      socket.on("connect_error", (err) => console.error(`AssignedJobs.jsx - Socket error: ${err.message}`));

      socket.on("jobAssigned", (data) => {
        console.log("AssignedJobs.jsx - jobAssigned event:", data);
        setMyJobs((prev) =>
          prev.map((job) =>
            job._id === data.jobId
              ? {
                  ...job,
                  status: "assigned",
                  assignedWalker: { id: data.walkerId, name: data.walkerName },
                  assignmentTimestamp: new Date(),
                }
              : job
          )
        );
        toast.info(data.message || `Job "${data.jobTitle}" assigned to ${data.walkerName}`);
      });

      socket.on("walkerOnMyWay", (data) => {
        console.log("AssignedJobs.jsx - walkerOnMyWay event:", data);
        setMyJobs((prev) =>
          prev.map((job) =>
            job._id === data.jobId ? { ...job, onMyWay: true } : job
          )
        );
      });

      socket.on("jobCompleted", (data) => {
        console.log("AssignedJobs.jsx - jobCompleted event:", data);
        setMyJobs((prev) =>
          prev.map((job) =>
            job._id === data.jobId
              ? { ...job, status: "completed", completedAt: new Date() }
              : job
          )
        );
      });

      return () => {
        socket.disconnect();
        console.log("AssignedJobs.jsx - Socket disconnected");
      };
    }
  }, [user?.id, user?.role, setMyJobs]);

  if (user?.role !== "owner") {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6 text-center">
        <p className="text-gray-600 text-sm sm:text-base">This page is for owners only.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <h2 className="text-2xl sm:text-3xl font-bold mb-6">Assigned Jobs</h2>
      {assignedJobs.length === 0 ? (
        <p className="text-gray-600 text-sm sm:text-base">
          No jobs are currently assigned.{" "}
          <Link to="/dashboard/my-jobs" className="text-purple-600 hover:text-purple-700">
            View all jobs
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-4">
          {assignedJobs.map((job) => (
            <div key={job._id} className="bg-white shadow-lg rounded-lg p-4 sm:p-6 border">
              <h3 className="text-lg sm:text-xl font-semibold truncate">
                <Link to={`/dashboard/job/${job._id}`} className="text-purple-600 hover:text-purple-700">
                  {job.title || "Untitled Job"}
                </Link>
              </h3>
              <p className="text-sm text-gray-600">
                <strong>Walker:</strong>{" "}
                <Link
                  to={`/dashboard/profile/${job.assignedWalker?.id}`}
                  className="text-purple-600 hover:text-purple-700"
                >
                  {job.assignedWalker?.name || "Unknown"}
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Status:</strong>{" "}
                {job.onMyWay ? "On My Way" : "Assigned"}
              </p>
              {job.onMyWay && jobMetrics[job._id] ? (
                <p className="text-sm text-gray-600">
                  <strong>Progress:</strong>{" "}
                  {jobMetrics[job._id].distance
                    ? `${jobMetrics[job._id].distance} km | ${jobMetrics[job._id].eta} min`
                    : "Calculating..."}
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  <strong>Location:</strong>{" "}
                  {job.geoLocation?.coordinates
                    ? `Lon: ${job.geoLocation.coordinates[0].toFixed(4)}, Lat: ${job.geoLocation.coordinates[1].toFixed(4)}`
                    : "N/A"}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
                <Link
                  to={`/dashboard/job/${job._id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors text-center"
                >
                  View Details
                </Link>
                <button
                  onClick={() => navigate(`/dashboard/messages?recipient=${job.assignedWalker?.id}`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded text-sm sm:text-base transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedJobs;