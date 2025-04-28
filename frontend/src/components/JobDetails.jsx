import { useParams, useNavigate } from "react-router-dom";
import { useRecoilState, useRecoilValue } from "recoil";
import { myJobsState } from "../recoil/MyJobAtom";
import { userAtom } from "../recoil/userAtom";
import { useEffect, useState, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const fallbackImage =
  "https://res.cloudinary.com/demo/image/upload/v1699999999/default-job-image.png";

const BATCH_SIZE = 6;

const JobDetails = () => {
  const { id } = useParams();
  const user = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const [myJobs, setMyJobs] = useRecoilState(myJobsState);
  const [selectedJob, setSelectedJob] = useState(null);
  const [application, setApplication] = useState(null);
  const [updatingApp, setUpdatingApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applicationMessage, setApplicationMessage] = useState("");

  // Pagination for owner view
  const [visibleApplicants, setVisibleApplicants] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  // Fetch job details and application status
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let job = myJobs.find((j) => j._id === id);
        if (!job) {
          const res = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/jobs/${id}`,
            { withCredentials: true }
          );
          job = res.data;
        }
        setSelectedJob(job);

        if (user.role === "walker") {
          const appRes = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/applications/my-applications?jobId=${id}`,
            { withCredentials: true }
          );
          setApplication(appRes.data[0] || null);
        }

        if (job && user.role === "owner") {
          setVisibleApplicants(job.applications?.slice(0, BATCH_SIZE) || []);
          setCurrentIndex(BATCH_SIZE);
          setHasMore(job.applications?.length > BATCH_SIZE);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load job details");
        setSelectedJob(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, myJobs, user.role]);

  // Pagination for owner view
  const lastApplicantRef = useCallback(
    (node) => {
      if (!hasMore || !node || user.role !== "owner") return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreApplicants();
        }
      });
      observer.current.observe(node);
    },
    [hasMore, currentIndex, selectedJob, user.role]
  );

  const loadMoreApplicants = () => {
    if (!selectedJob) return;
    const nextBatch = selectedJob.applications.slice(
      currentIndex,
      currentIndex + BATCH_SIZE
    );
    setVisibleApplicants((prev) => [...prev, ...nextBatch]);
    setCurrentIndex((prev) => prev + BATCH_SIZE);
    if (currentIndex + BATCH_SIZE >= selectedJob.applications.length) {
      setHasMore(false);
    }
  };

  // Handle status change for owner
  const handleStatusChange = async (applicationId, status) => {
    try {
      setUpdatingApp(applicationId);
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/update-status`,
        { applicationId, status },
        { withCredentials: true }
      );
      const updatedJobs = myJobs.map((job) => {
        if (job._id !== id) return job;
        const updatedApplications = job.applications.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        );
        return { ...job, applications: updatedApplications };
      });
      setMyJobs(updatedJobs);
      toast.success(`Application ${status} successfully`);
      setVisibleApplicants((prev) =>
        prev.map((app) =>
          app._id === applicationId ? { ...app, status } : app
        )
      );
    } catch (error) {
      toast.error("Failed to update application status");
      console.error(error);
    } finally {
      setUpdatingApp(null);
    }
  };

  // Handle apply for walker
  const handleApply = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/apply`,
        { jobId: id, message: applicationMessage },
        { withCredentials: true }
      );
      toast.success("Applied successfully!");
      setApplication(res.data);
      setApplicationMessage("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to apply");
      console.error(error);
    }
  };

  // Handle send message
  const handleSendMessage = (recipientId) => {
    if (!recipientId) {
      toast.error("Cannot send message: Recipient not found");
      return;
    }
    navigate(`/dashboard/messages?recipient=${recipientId}`); // Updated route
  };

  if (loading) return <div className="text-center p-6">Loading job details...</div>;
  if (!selectedJob) return <div className="text-center p-6">Job not found.</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow rounded-lg">
      <img
        src={selectedJob.image || fallbackImage}
        alt={selectedJob.title || "Job"}
        className="w-full h-64 object-contain rounded-lg mb-4"
      />
      <h2 className="text-2xl font-bold mb-2">{selectedJob.title || "Untitled Job"}</h2>
      <p className="mb-2 text-gray-600">{selectedJob.description || "No description"}</p>
      <p className="mb-2"><strong>Pay:</strong> ₹{selectedJob.pay || "N/A"}</p>
      <p className="mb-4"><strong>Location:</strong> {selectedJob.location || "Unknown location"}</p>
      {user.role !== "owner" && selectedJob.coordinates && (
        <p className="mb-4"><strong>Coordinates:</strong> Lat: {selectedJob.coordinates.lat}, Lng: {selectedJob.coordinates.lng}</p>
      )}

      {user.role === "owner" ? (
        <>
          <h3 className="text-xl font-semibold mt-6 mb-2">Applicants</h3>
          {visibleApplicants.length === 0 ? (
            <p>No applications yet.</p>
          ) : (
            visibleApplicants.map((app, index) => {
              const isLast = index === visibleApplicants.length - 1;
              return (
                <div
                  ref={isLast ? lastApplicantRef : null}
                  key={app._id}
                  className="border p-4 rounded-lg flex justify-between items-center mb-3"
                >
                  <div>
                    <p className="font-semibold">{app.applicant?.name || "Unknown Applicant"}</p>
                    <p className="text-sm text-gray-600">Status: {app.status || "N/A"}</p>
                    {app.message && (
                      <p className="text-sm text-gray-600">Message: {app.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {app.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleStatusChange(app._id, "accepted")}
                          className="bg-green-500 text-white px-3 py-1 rounded"
                          disabled={updatingApp === app._id}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleStatusChange(app._id, "rejected")}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                          disabled={updatingApp === app._id}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigate(app.applicant?.id ? `/profile/${app.applicant.id}` : "#")}
                      className={`bg-blue-500 text-white px-3 py-1 rounded ${
                        !app.applicant?.id ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!app.applicant?.id}
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => handleSendMessage(app.applicant?.id)}
                      className={`bg-purple-600 text-white px-3 py-1 rounded ${
                        !app.applicant?.id ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                      disabled={!app.applicant?.id}
                    >
                      Send Message
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {hasMore && (
            <div className="text-center text-sm text-gray-600 my-4">Loading more...</div>
          )}
        </>
      ) : (
        <div className="mt-4">
          {application ? (
            <div className="flex gap-4 items-center">
              <span
                className={`px-3 py-2 text-sm font-semibold rounded-full ${
                  application.status === "accepted"
                    ? "bg-green-100 text-green-800"
                    : application.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800"
                }`}
              >
                Applied - {application.status || "Pending"}
              </span>
              <button
                onClick={() => handleSendMessage(selectedJob.owner?.id)}
                className={`bg-purple-600 text-white px-4 py-2 rounded ${
                  !selectedJob.owner?.id ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!selectedJob.owner?.id}
              >
                Send Message
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                placeholder="Add a message with your application (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleApply}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  disabled={selectedJob.status !== "open"}
                >
                  Apply
                </button>
                <button
                  onClick={() => handleSendMessage(selectedJob.owner?.id)}
                  className={`bg-purple-600 text-white px-4 py-2 rounded ${
                    !selectedJob.owner?.id ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={!selectedJob.owner?.id}
                >
                  Send Message
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobDetails;