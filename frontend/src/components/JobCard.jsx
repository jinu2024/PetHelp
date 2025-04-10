import React, { useState } from "react";
import {
  FaMapMarkerAlt,
  FaRupeeSign,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";

const JobCard = ({ job }) => {
  const [showApplicants, setShowApplicants] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  // Maximum length for truncated description
  const MAX_DESCRIPTION_LENGTH = 100;

  // Truncate description if it's too long
  const truncatedDescription =
    job.description.length > MAX_DESCRIPTION_LENGTH && !showFullDescription
      ? job.description.slice(0, MAX_DESCRIPTION_LENGTH) + "..."
      : job.description;

  return (
    <div className="border p-4 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 mb-4 bg-white">
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Text block */}
        <div className="flex-1 w-full">
          <h2 className="text-lg lg:text-xl font-semibold text-gray-800">{job.title}</h2>
          <p className="text-gray-600 mt-1 text-sm lg:text-base">
            {truncatedDescription}
            {job.description.length > MAX_DESCRIPTION_LENGTH && (
              <button
                onClick={() => setShowFullDescription((prev) => !prev)}
                className="text-blue-600 hover:underline ml-1 text-sm"
              >
                {showFullDescription ? "Show less" : "Show more"}
              </button>
            )}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="text-red-500" />
              <span>{job.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaRupeeSign className="text-green-600" />
              <span>{job.pay}</span>
            </div>
          </div>

          <span
            className={`inline-block px-3 py-1 text-xs mt-2 rounded-full ${
              job.status === "open"
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {job.status.toUpperCase()}
          </span>
        </div>

        {/* Image block */}
        {job.image && (
          <div className="w-full lg:w-36 shrink-0">
            <img
              src={job.image}
              alt={job.title}
              className="w-full h-auto max-h-56 lg:h-28 object-contain rounded-lg"
            />
          </div>
        )}
      </div>

      {/* Applicants toggle */}
      <button
        onClick={() => setShowApplicants((prev) => !prev)}
        className="mt-4 text-blue-600 hover:underline text-sm flex items-center"
      >
        {showApplicants ? (
          <FaChevronUp className="mr-1" />
        ) : (
          <FaChevronDown className="mr-1" />
        )}
        {job.applications?.length || 0} Applicant
        {job.applications?.length === 1 ? "" : "s"}
      </button>

      {/* Applicant list */}
      {showApplicants && job.applications?.length > 0 && (
        <ul className="mt-2 pl-4 list-disc text-sm text-gray-700">
          {job.applications.map((app, idx) => (
            <li key={idx}>
              <span className="font-medium">{app.walker?.name}</span>{" "}
              <span className="text-gray-500">({app.status})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default JobCard;