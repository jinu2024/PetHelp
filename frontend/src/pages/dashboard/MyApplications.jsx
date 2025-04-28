import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/userAtom";
import axios from "axios";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";

const BATCH_SIZE = 6;

const MyApplicationsWalker = () => {
  const user = useRecoilValue(userAtom);
  const [applications, setApplications] = useState([]);
  const [visibleApplications, setVisibleApplications] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const observer = useRef();

  console.log("User:", user);

  // Redirect non-walkers
  if (user.role !== "walker") {
    return <div className="text-center p-6">Access restricted to walkers.</div>;
  }

  // Fetch applications
  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/applications/my-applications`,
          { withCredentials: true }
        );
        console.log("API Response:", res.data);
        setApplications(res.data);
        setVisibleApplications(res.data.slice(0, BATCH_SIZE));
        setCurrentIndex(BATCH_SIZE);
        setHasMore(res.data.length > BATCH_SIZE);
      } catch (error) {
        console.error("Error fetching applications:", error.response?.data || error);
        toast.error("Failed to load applications");
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  // Pagination logic
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

  console.log("Applications:", applications);
  console.log("Visible Applications:", visibleApplications);

  if (loading) {
    return <div className="text-center p-6">Loading applications...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">My Applications</h2>
      {applications.length === 0 ? (
        <p className="text-gray-600">You haven’t applied to any jobs yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Job Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied On
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {visibleApplications.map((app, index) => {
                const isLast = index === visibleApplications.length - 1;
                return (
                  <tr key={app._id} ref={isLast ? lastApplicationRef : null}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/dashboard/job/${app.job?._id || ''}`}
                        className="text-blue-600 hover:underline"
                      >
                        {app.job?.title || "Untitled Job"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          app.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : app.status === "rejected"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {app.status || "Pending"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.createdAt
                        ? new Date(app.createdAt).toLocaleDateString()
                        : "N/A"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {hasMore && (
            <div className="text-center text-sm text-gray-600 my-4">
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyApplicationsWalker;