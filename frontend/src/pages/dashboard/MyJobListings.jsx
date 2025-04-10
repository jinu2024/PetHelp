import React from "react";
import useMyJobListings from "../../hooks/useMyjobListings";
import JobCard from "../../components/JobCard";

const MyJobListings = () => {
  const { jobs, loading } = useMyJobListings();
 

  if (loading) return <p>Loading your jobs...</p>;

  if (!Array.isArray(jobs)) {
    return <p>Error: Failed to load job listings.</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">My Posted Jobs</h2>
      {jobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard key={job._id} job={job} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">You haven’t posted any jobs yet.</p>
      )}
    </div>
  );
};

export default MyJobListings;
