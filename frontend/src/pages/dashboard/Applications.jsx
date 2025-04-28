import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRecoilState, useRecoilValue } from "recoil";
import { myJobsState } from "../../recoil/MyJobAtom";
import { userAtom } from "../../recoil/userAtom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import useMyJobListings from "../../hooks/useMyJobListings";

const BATCH_SIZE = 6;

const Applications = () => {
  const user = useRecoilValue(userAtom);
  const [myJobs, setMyJobs] = useRecoilState(myJobsState);
  const { jobs, loading: jobsLoading } = useMyJobListings();
  const [applications, setApplications] = useState([]);
  const [visibleApplications, setVisibleApplications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [updatingApp, setUpdatingApp] = useState(null);
  const observer = useRef();

  // Redirect non-owners
  if (user.role !== "owner") {
    return <div className="text-center p-6">Access restricted to owners.</div>;
  }

  // Flatten applications from jobs
  useEffect(() => {
    if (jobsLoading || !jobs) return;

    const allApplications = jobs
      .flatMap((job) =>
        (job.applications || []).map((app) => ({
          ...app,
          jobId: job._id,
          jobTitle: job.title || "Untitled Job",
        }))
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Sort by application date

    setApplications(allApplications);
    setVisibleApplications(allApplications.slice(0, BATCH_SIZE));
    setCurrentIndex(BATCH_SIZE);
    setHasMore(allApplications.length > BATCH_SIZE);
  }, [jobs, jobsLoading]);

  // Pagination
  const lastApplicationRef = useCallback(
    (node) => {
      if (!hasMore || !node) return;

      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreApplications();
        }
      });

      observer.current.observe(node);
    },
    [hasMore, currentIndex]
  );

  const loadMoreApplications = () => {
    const nextBatch = applications.slice(currentIndex, currentIndex + BATCH_SIZE);
    setVisibleApplications((prev) => [...prev, ...nextBatch]);
    setCurrentIndex((prev) => prev + BATCH_SIZE);
    if (currentIndex + BATCH_SIZE >= applications.length) {
      setHasMore(false);
    }
  };

  // Handle status change
  const handleStatusChange = async (applicationId, status, jobId) => {
    try {
      setUpdatingApp(applicationId);

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/update-status`,
        { applicationId, status },
        { withCredentials: true }
      );

      const updatedJobs = myJobs.map((job) => {
        if (job._id !== jobId) return job;
        const updatedApplications = job.applications.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        );
        return { ...job, applications: updatedApplications };
      });

      setMyJobs(updatedJobs);
      setApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        )
      );
      setVisibleApplications((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        )
      );

      toast.success(`Application ${status} successfully`);
    } catch (error) {
      toast.error("Failed to update application status");
      console.error(error);
    } finally {
      setUpdatingApp(null);
    }
  };

  if (jobsLoading) {
    return <div className="text-center p-6">Loading applications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>
      {applications.length === 0 ? (
        <p className="text-gray-600">No applications for your jobs yet.</p>
      ) : (
        <div>
          {visibleApplications.map((app, index) => {
            const isLast = index === visibleApplications.length - 1;
            return (
              <div
                ref={isLast ? lastApplicationRef : null}
                key={app._id}
                className="border p-4 rounded-lg flex justify-between items-center mb-3 bg-white shadow"
              >
                <div>
                  <p className="font-semibold">
                    {app.walker?.name || app.applicant?.name || "Unknown"}
                  </p>
                  <p className="text-sm text-gray-600">
                    Job: <Link to={`/dashboard/job/${app.jobId}`} className="text-blue-600 hover:underline">
                      {app.jobTitle}
                    </Link>
                  </p>
                  <p className="text-sm text-gray-600">Status: {app.status || "N/A"}</p>
                </div>
                <div className="flex gap-2">
                  {app.status === "pending" && (
                    <>
                      <button
                        onClick={() => handleStatusChange(app._id, "accepted", app.jobId)}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                        disabled={updatingApp === app._id}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleStatusChange(app._id, "rejected", app.jobId)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        disabled={updatingApp === app._id}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() =>
                      alert(`View profile for ${app.walker?.name || app.applicant?.name || "user"}`)
                    }
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            );
          })}
          {hasMore && (
            <div className="text-center text-sm text-gray-600 my-4">Loading more...</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Applications;