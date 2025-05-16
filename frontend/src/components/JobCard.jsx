import React, { useState } from "react";
import { FaMapMarkerAlt, FaRupeeSign } from "react-icons/fa";
import { Link } from "react-router-dom";

const JobCard = ({ job, role, onApply }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const MAX_DESCRIPTION_LENGTH = role === "owner" ? 100 : 50;
  const fallbackImage = "https://res.cloudinary.com/demo/image/upload/v1699999999/default-job-image.png";

  const truncateAddress = (address, maxLength = 30) => {
    if (!address) return "Unknown location";
    return address.length > maxLength ? address.slice(0, maxLength) + "..." : address;
  };

  const truncatedDescription =
    job.description && job.description.length > MAX_DESCRIPTION_LENGTH && !showFullDescription
      ? job.description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
      : job.description || "No description";

  return (
    <div className="relative group border p-3 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 mb-4 bg-white overflow-hidden">
      <Link to={`/dashboard/job/${job._id}`} className="absolute inset-0 z-0" onClick={(e) => {
        if (e.target.closest("button")) e.preventDefault();
      }} />
      <div className="flex flex-col gap-3 relative z-10">
        {job.image && (
          <img
            src={job.image || fallbackImage}
            alt={job.title || "Job"}
            className="w-full h-32 object-contain rounded-lg mb-2"
          />
        )}
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-800 group-hover:text-blue-600 transition truncate">
            {job.title || "Untitled Job"}
          </h2>
          {role === "owner" ? (
            <>
              <p className="text-gray-600 mt-1 text-sm">{truncatedDescription}</p>
              <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-red-500" />
                  <span>{truncateAddress(job.location)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaRupeeSign className="text-green-600" />
                  <span>{job.pay || "N/A"}</span>
                </div>
              </div>
              <span
                className={`inline-block px-3 py-1 text-xs mt-2 rounded-full ${
                  job.status === "open"
                    ? "bg-green-100 text-green-800"
                    : job.status === "assigned"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {job.status ? job.status.toUpperCase() : "UNKNOWN"}
              </span>
              {job.status === "assigned" && job.assignedWalker && (
                <p className="mt-2 text-sm text-gray-600">
                  Assigned to: {job.assignedWalker.name || "Unknown"}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-gray-600 mt-1 truncate">{truncatedDescription}</p>
              <p className="text-xs text-gray-600 truncate">Posted by: {job?.owner?.name || "Unknown"}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <FaMapMarkerAlt className="text-red-500" />
                  <span>{truncateAddress(job.location)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <FaRupeeSign className="text-green-600" />
                  <span>{job.pay || "N/A"}</span>
                </div>
                {job.distanceInKm && (
                  <div className="flex items-center gap-1">
                    <FaMapMarkerAlt className="text-blue-500" />
                    <span>{job.distanceInKm} km away</span>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onApply(job._id);
                }}
                className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded w-full text-sm mt-2 ${
                  job.status !== "open" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={job.status !== "open"}
              >
                {job.status === "assigned" && job.assignedWalker?.id === user?._id ? "Assigned" : "Apply"}
              </button>
            </>
          )}
          <p className="mt-2 text-xs text-gray-600">Note: All payments must be made via the platform (coming soon).</p>
        </div>
      </div>
    </div>
  );
};

export default JobCard;