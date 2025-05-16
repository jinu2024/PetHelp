import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useRecoilValue, useRecoilState } from "recoil";
import { userAtom } from "../recoil/userAtom";
import { myJobsState } from "../recoil/MyJobAtom";
import axios from "axios";
import { toast } from "react-toastify";
import io from "socket.io-client";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Compare waypoints with tolerance
const areWaypointsEqual = (waypointsA, waypointsB, tolerance = 0.0001) => {
  if (!waypointsA || !waypointsB || waypointsA.length !== waypointsB.length) return false;
  return waypointsA.every((wpA, i) => {
    const wpB = waypointsB[i];
    return (
      Math.abs(wpA.lat - wpB.lat) < tolerance &&
      Math.abs(wpA.lng - wpB.lng) < tolerance
    );
  });
};

const JobDetails = () => {
  const { id } = useParams();
  const user = useRecoilValue(userAtom);
  const [myJobs, setMyJobs] = useRecoilState(myJobsState);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [walkerPosition, setWalkerPosition] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);
  const [bearing, setBearing] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  // NEW: State for cancellation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const watchIdRef = useRef(null);
  const prevPositionRef = useRef(null);
  const navigate = useNavigate();

  // Throttle for position updates
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

  // Fetch job and initialize Socket.io
  useEffect(() => {
    console.log("JobDetails.jsx - User:", user);
    let socket;

    if (user?.id) {
      socket = io(import.meta.env.VITE_BACKEND_URL, {
        withCredentials: true,
        query: { userId: user.id },
      });

      socket.on("connect", () => console.log(`JobDetails.jsx - Socket connected: ${socket.id}`));
      socket.on("connect_error", (err) => {
        console.error("JobDetails.jsx - Socket connection error:", err.message);
        toast.error("Failed to connect to notifications");
      });

      socket.on("jobAssigned", (data) => {
        console.log("JobDetails.jsx - jobAssigned event:", data);
        if (data.jobId === id) {
          setJob((prev) => ({
            ...prev,
            status: "assigned",
            assignedWalker: { id: data.walkerId, name: data.walkerName },
            assignmentTimestamp: new Date(),
          }));
          setMyJobs((prev) =>
            prev.map((j) =>
              j._id === id
                ? { ...j, status: "assigned", assignedWalker: { id: data.walkerId, name: data.walkerName } }
                : j
            )
          );
          setTimeLeft(5 * 60);
        }
      });

      socket.on("assignmentConfirmed", (data) => {
        console.log("JobDetails.jsx - assignmentConfirmed event:", data);
        if (data.jobId === id && user.role === "walker") {
          setJob((prev) => ({
            ...prev,
            status: "assigned",
            assignedWalker: { id: user.id, name: user.name },
            assignmentTimestamp: new Date(),
          }));
          toast.success(data.message);
        }
      });

      socket.on("assignmentCanceled", (data) => {
        console.log("JobDetails.jsx - assignmentCanceled event:", data);
        if (data.jobId === id) {
          setJob((prev) => ({
            ...prev,
            status: "open",
            assignedWalker: null,
            assignmentTimestamp: null,
            onMyWay: false,
            walkerPosition: null,
          }));
          setMyJobs((prev) =>
            prev.map((j) => (j._id === id ? { ...j, status: "open", assignedWalker: null } : j))
          );
          setWalkerPosition(null);
          setDistance(null);
          setEta(null);
          setTimeLeft(null);
          setCancelReason("");
          setIsMapOpen(false);
          toast.info(data.message);
        }
      });

      socket.on("jobCompleted", (data) => {
        console.log("JobDetails.jsx - jobCompleted event:", data);
        if (data.jobId === id) {
          setJob((prev) => ({
            ...prev,
            status: "closed",
            completedAt: new Date(),
          }));
          setMyJobs((prev) =>
            prev.map((j) => (j._id === id ? { ...j, status: "closed", completedAt: new Date() } : j))
          );
          setWalkerPosition(null);
          setDistance(null);
          setEta(null);
          setIsMapOpen(false);
          toast.info(data.message);
        }
      });

      socket.on("walkerPositionUpdate", (data) => {
        console.log("JobDetails.jsx - walkerPositionUpdate event:", data);
        if (data.jobId === id && user.role === "owner") {
          if (
            data.position &&
            Array.isArray(data.position) &&
            data.position.length === 2 &&
            !isNaN(data.position[0]) &&
            !isNaN(data.position[1])
          ) {
            setWalkerPosition(data.position);
            if (prevPositionRef.current) {
              const bearing = calculateBearing(prevPositionRef.current, data.position);
              setBearing(bearing);
            }
            prevPositionRef.current = data.position;
            if (job?.geoLocation?.coordinates) {
              fetchRouteData(data.position, [job.geoLocation.coordinates[1], job.geoLocation.coordinates[0]]);
            }
          } else {
            console.warn("JobDetails.jsx - Invalid walkerPositionUpdate:", data.position);
          }
        }
      });
    } else {
      console.warn("JobDetails.jsx - Socket.IO not connected: user.id is missing");
    }

    const fetchJob = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/jobs/${id}`, {
          withCredentials: true,
        });
        console.log("JobDetails.jsx - Fetched job:", res.data);
        setJob(res.data);
        if (res.data.onMyWay && res.data.walkerPosition) {
          setWalkerPosition(res.data.walkerPosition);
        }
        if (res.data.assignmentTimestamp && res.data.status === "assigned") {
          const timeElapsed = Date.now() - new Date(res.data.assignmentTimestamp).getTime();
          const timeRemaining = Math.max(5 * 60 * 1000 - timeElapsed, 0);
          setTimeLeft(Math.ceil(timeRemaining / 1000));
        }
      } catch (error) {
        console.error("JobDetails.jsx - Fetch job error:", error.response?.data, error.response?.status);
        toast.error("Failed to load job details");
        setJob(null);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();

    return () => {
      if (socket) socket.disconnect();
      console.log("JobDetails.jsx - Socket disconnected");
    };
  }, [id, user?.id, user?.role, user?.name, setMyJobs]);

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft]);

  // Geolocation for walker
  useEffect(() => {
    if (isMapOpen && navigator.geolocation && user.role === "walker" && job?.status === "assigned" && job?.onMyWay) {
      const updatePosition = throttle(async (position) => {
        const newPos = [position.coords.latitude, position.coords.longitude];
        setWalkerPosition(newPos);

        try {
          const response = await axios.post(
            `${import.meta.env.VITE_BACKEND_URL}/api/jobs/update-position`,
            { jobId: id, position: newPos },
            { withCredentials: true }
          );
          console.log("JobDetails.jsx - Position update response:", response.data);
        } catch (error) {
          console.error("JobDetails.jsx - Error sending walker position:", error.response?.data);
          toast.error("Failed to update position");
        }

        if (prevPositionRef.current && position.coords.heading !== null && !isNaN(position.coords.heading)) {
          setBearing(position.coords.heading);
        } else if (prevPositionRef.current) {
          const bearing = calculateBearing(prevPositionRef.current, newPos);
          setBearing(bearing);
        }
        prevPositionRef.current = newPos;

        setGeoError(null);
        if (job?.geoLocation?.coordinates) {
          fetchRouteData(newPos, [job.geoLocation.coordinates[1], job.geoLocation.coordinates[0]]);
        }
      }, 2000);

      watchIdRef.current = navigator.geolocation.watchPosition(
        updatePosition,
        (error) => {
          console.error("JobDetails.jsx - Geolocation error:", error);
          setGeoError("Please enable geolocation to track your location.");
          setWalkerPosition(null);
          setDistance(null);
          setEta(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isMapOpen, job?.status, job?.onMyWay, job?.geoLocation?.coordinates, user.role, id]);

  const calculateBearing = (start, end) => {
    const [lat1, lon1] = start;
    const [lat2, lon2] = end;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  const fetchRouteData = useCallback(
    debounce(async (start, end) => {
      try {
        const url = `https://router.project-osrm.org/route/v1/walking/${start[1]},${start[0]};${end[1]},${end[0]}?overview=false`;
        const res = await axios.get(url);
        const route = res.data.routes[0];
        setDistance((route.distance / 1000).toFixed(2));
        setEta(Math.ceil(route.duration / 60));
      } catch (error) {
        console.error("JobDetails.jsx - OSRM error:", error);
        setDistance(null);
        setEta(null);
        toast.error("Failed to calculate route");
      }
    }, 1000),
    []
  );

  const handleApply = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/applications/apply`,
        { jobId: id },
        { withCredentials: true }
      );
      setJob(res.data.job);
      setMyJobs((prev) =>
        prev.map((j) => (j._id === id ? { ...j, ...res.data.job } : j))
      );
      toast.success("Assigned successfully!");
    } catch (error) {
      console.error("JobDetails.jsx - Apply error:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to apply");
    }
  };

  const handleCancel = async () => {
    if (user.role === "owner" && job.onMyWay && timeLeft <= 0 && !cancelReason) {
      toast.error("Please provide a reason for cancellation");
      return;
    }
    // NEW: Show cancellation modal instead of window.confirm
    setShowCancelModal(true);
  };

  // NEW: Handle cancellation confirmation
  const confirmCancel = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/jobs/applications/cancel`,
        { jobId: id, reason: user.role === "owner" ? cancelReason || null : null },
        { withCredentials: true }
      );
      toast.success("Assignment canceled!");
      setShowCancelModal(false);
    } catch (error) {
      console.error("JobDetails.jsx - Cancel error:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to cancel");
    }
  };

  const handleMarkComplete = async () => {
    if (!window.confirm("Are you sure you want to mark this job as complete?")) return;
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/jobs/mark-complete`,
        { jobId: id },
        { withCredentials: true }
      );
      setJob(res.data.job);
      setMyJobs((prev) =>
        prev.map((j) => (j._id === id ? { ...j, ...res.data.job } : j))
      );
      toast.success("Job marked as completed!");
    } catch (error) {
      console.error("JobDetails.jsx - Mark complete error:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to mark complete");
    }
  };

  const handleOnMyWay = async () => {
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/jobs/on-my-way`,
        { jobId: id },
        { withCredentials: true }
      );
      setJob((prev) => ({ ...prev, onMyWay: res.data.onMyWay }));
      setMyJobs((prev) =>
        prev.map((j) => (j._id === id ? { ...j, onMyWay: res.data.onMyWay } : j))
      );
      setIsMapOpen(true);
      toast.success("You’re on the way!");
    } catch (error) {
      console.error("JobDetails.jsx - OnMyWay error:", error.response?.data);
      toast.error(error.response?.data?.message || "Failed to mark on my way");
    }
  };

  const handleViewMap = async () => {
    if (user.role === "owner" && job.onMyWay && !walkerPosition) {
      let retries = 3;
      while (retries > 0) {
        try {
          const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/jobs/${id}/walker-position`, {
            withCredentials: true,
          });
          if (res.data.walkerPosition && Array.isArray(res.data.walkerPosition) && res.data.walkerPosition.length === 2) {
            setWalkerPosition(res.data.walkerPosition);
            if (job?.geoLocation?.coordinates) {
              fetchRouteData(res.data.walkerPosition, [job.geoLocation.coordinates[1], job.geoLocation.coordinates[0]]);
            }
            break;
          }
        } catch (error) {
          console.error("JobDetails.jsx - Fetch walker position error:", error.response?.data);
        }
        retries--;
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      if (!walkerPosition) {
        toast.error("Unable to fetch walker position");
      }
    }
    setIsMapOpen(true);
  };

  const handleViewProfile = (userId) => {
    if (!userId) {
      toast.error("Cannot view profile: User not found");
      return;
    }
    navigate(`/dashboard/profile/${userId}`);
  };

  const handleSendMessage = (recipientId) => {
    if (!recipientId) {
      toast.error("Cannot send message: Recipient not found");
      return;
    }
    navigate(`/dashboard/messages?recipient=${recipientId}`);
  };

  if (loading) return <div className="text-center p-4 sm:p-6 text-gray-600 text-sm sm:text-base">Loading job details...</div>;
  if (!job) return <div className="text-center p-4 sm:p-6 text-gray-600 text-sm sm:text-base">Job not found.</div>;

  const MapView = React.memo(() => {
    const jobPosition = job.geoLocation?.coordinates ? [job.geoLocation.coordinates[1], job.geoLocation.coordinates[0]] : null;

    if (!jobPosition) {
      return <div className="text-red-600 text-sm sm:text-base">Job location not available.</div>;
    }

    // NEW: Dynamic zoom based on distance
    const distanceKm = distance ? parseFloat(distance) : 10;
    const zoom = distanceKm > 5 ? 11 : distanceKm > 1 ? 13 : 15;

    const arrowIcon = L.divIcon({
      className: "arrow-icon",
      html: `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${bearing}deg);">
          <path d="M12 2L2 19h8v3h4v-3h8L12 2z" fill="#3b82f6"/>
        </svg>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    return (
      <div>
        <div className="bg-gray-100 p-2 mb-2 rounded text-sm sm:text-base">
          {/* NEW: Loading state and retry button */}
          {distance === null || eta === null ? (
            <div className="flex items-center">
              <svg
                className="animate-spin h-5 w-5 mr-2 text-gray-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z"
                ></path>
              </svg>
              <p>Loading route...</p>
            </div>
          ) : (
            <p>Distance: {distance} km | ETA: {eta} min</p>
          )}
          {/* NEW: Retry button for failed routes */}
          {(distance === null || eta === null) && walkerPosition && jobPosition && (
            <button
              onClick={() => fetchRouteData(walkerPosition, jobPosition)}
              className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-sm"
            >
              Retry Route
            </button>
          )}
        </div>
        <MapContainer
          center={jobPosition}
          zoom={zoom} // NEW: Use dynamic zoom
          style={{ height: "400px", width: "100%" }}
          className="rounded-lg"
          doubleClickZoom={true}
          scrollWheelZoom={true}
          touchZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <Marker
            position={jobPosition}
            eventHandlers={{
              click: () => toast.info(`Job: ${job.location}`),
            }}
          >
            <Popup>Job Location: {job.location}</Popup>
          </Marker>
          {walkerPosition && (
            <Marker
              position={walkerPosition}
              icon={arrowIcon}
              eventHandlers={{
                click: () => toast.info(user.role === "walker" ? "Your current location" : "Walker’s location"),
              }}
            >
              <Popup>{user.role === "walker" ? "Your Location" : "Walker’s Location"}</Popup>
            </Marker>
          )}
          {walkerPosition && jobPosition && job.status === "assigned" && job.onMyWay && (
            <RoutingControl
              waypoints={[L.latLng(walkerPosition), L.latLng(jobPosition)]}
              lineOptions={{ styles: [{ color: "#3b82f6", weight: 4 }] }}
              show={true}
              addWaypoints={false}
              fitSelectedRoutes={true}
            />
          )}
        </MapContainer>
      </div>
    );
  });

  const RoutingControl = React.memo(({ waypoints, lineOptions, show, addWaypoints, fitSelectedRoutes }) => {
    const map = useMap();
    const routingControlRef = useRef(null);
    const prevWaypointsRef = useRef(null);
    const isMountedRef = useRef(false);

    // Debounced setWaypoints
    const debouncedSetWaypoints = useCallback(
      debounce((control, newWaypoints) => {
        if (!isMountedRef.current || !control) return;
        try {
          control.setWaypoints(newWaypoints);
          console.log("JobDetails.jsx - RoutingControl - Updated waypoints:", newWaypoints);
        } catch (err) {
          console.error("JobDetails.jsx - RoutingControl - Error updating waypoints:", err);
          toast.error("Failed to update route");
        }
      }, 1000),
      []
    );

    useEffect(() => {
      isMountedRef.current = true;

      if (!map || !waypoints || waypoints.length < 2 || job.status !== "assigned" || !job.onMyWay) {
        if (routingControlRef.current) {
          try {
            map.removeControl(routingControlRef.current);
            console.log("JobDetails.jsx - RoutingControl - Removed invalid routing control");
          } catch (err) {
            console.error("JobDetails.jsx - RoutingControl - Error removing invalid routing control:", err);
          }
          routingControlRef.current = null;
        }
        return;
      }

      // Validate waypoints
      const validWaypoints = waypoints.filter((wp) => wp && !isNaN(wp.lat) && !isNaN(wp.lng));
      if (validWaypoints.length < 2) {
        console.log("JobDetails.jsx - RoutingControl - Skipping routing: invalid waypoints", waypoints);
        return;
      }

      // Initialize routing control
      if (!routingControlRef.current) {
        // Delay initialization to ensure map is ready
        const timeout = setTimeout(() => {
          if (!isMountedRef.current) return;
          // Suppress OSRM warning in production
          const originalConsoleWarn = console.warn;
          if (import.meta.env.PROD) {
            console.warn = () => {};
          }
          // TODO: Post-beta, replace with Mapbox: L.Routing.mapbox(import.meta.env.VITE_MAPBOX_TOKEN, { profile: "mapbox/walking" })
          routingControlRef.current = L.Routing.control({
            waypoints: validWaypoints,
            lineOptions,
            router: L.Routing.osrmv1({
              serviceUrl: "https://router.project-osrm.org/route/v1",
            }),
            show,
            addWaypoints,
            fitSelectedRoutes,
            showAlternatives: false,
            createMarker: () => null,
          })
            .on("routesfound", (e) => {
              console.log("JobDetails.jsx - RoutingControl - Routes found:", e.routes.length);
            })
            .on("routingerror", (e) => {
              console.error("JobDetails.jsx - RoutingControl - Routing error:", e.error);
              toast.error("Failed to calculate route");
            });

          try {
            routingControlRef.current.addTo(map);
            console.log("JobDetails.jsx - RoutingControl - Added routing control with waypoints:", validWaypoints);
          } catch (err) {
            console.error("JobDetails.jsx - RoutingControl - Error adding routing control:", err);
            toast.error("Failed to display route");
          }

          // Restore console.warn
          if (import.meta.env.PROD) {
            console.warn = originalConsoleWarn;
          }
        }, 100);

        return () => clearTimeout(timeout);
      }

      // Update waypoints if changed significantly
      if (
        routingControlRef.current &&
        !areWaypointsEqual(validWaypoints, prevWaypointsRef.current)
      ) {
        debouncedSetWaypoints(routingControlRef.current, validWaypoints);
        prevWaypointsRef.current = validWaypoints;
      }

      return () => {
        isMountedRef.current = false;
        if (routingControlRef.current) {
          try {
            map.removeControl(routingControlRef.current);
            console.log("JobDetails.jsx - RoutingControl - Cleaned up routing control");
          } catch (err) {
            console.error("JobDetails.jsx - RoutingControl - Error removing routing control on cleanup:", err);
          }
          routingControlRef.current = null;
        }
      };
    }, [map, waypoints, lineOptions, show, addWaypoints, fitSelectedRoutes, job?.status, job?.onMyWay]);

    // Cleanup when map modal closes
    useEffect(() => {
      if (!isMapOpen && routingControlRef.current) {
        try {
          map.removeControl(routingControlRef.current);
          console.log("JobDetails.jsx - RoutingControl - Cleaned up routing control on map close");
          routingControlRef.current = null;
          prevWaypointsRef.current = null;
        } catch (err) {
          console.error("JobDetails.jsx - RoutingControl - Error removing routing control on map close:", err);
        }
      }
    }, [isMapOpen, map]);

    return null;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-white shadow-lg rounded-lg">
      <img
        src={job.image || "https://res.cloudinary.com/demo/image/upload/v1699999999/default-job-image.png"}
        alt={job.title || "Job"}
        className="w-full h-48 sm:h-64 object-contain rounded-lg mb-4"
      />
      <h2 className="text-xl sm:text-2xl font-bold mb-2 truncate">{job.title || "Untitled Job"}</h2>
      <p className="mb-2 text-gray-600 text-sm sm:text-base">{job.description || "No description"}</p>
      <p className="mb-2 text-sm sm:text-base">
        <strong>Pay:</strong> ₹{job.pay || "N/A"}
      </p>
      <p className="mb-4 text-sm sm:text-base">
        <strong>Location:</strong> {job.location || "Unknown location"}
      </p>
      {user.role === "owner" && (
        <>
          {job.status === "assigned" && job.assignedWalker ? (
            <div className="mb-4">
              <p className="text-sm sm:text-base">
                <strong>Assigned to:</strong> {job.assignedWalker.name || "Unknown"}
              </p>
              <p className="text-sm sm:text-base">
                <strong>Status:</strong> {job.onMyWay ? "On My Way" : "Assigned"}
              </p>
              {timeLeft > 0 ? (
                <p className="text-sm sm:text-base text-yellow-600">
                  Free cancellation for: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                </p>
              ) : job.onMyWay ? (
                <div className="text-sm sm:text-base">
                  <p className="text-gray-600">Cancellation requires a reason</p>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation"
                    className="w-full p-2 mt-2 border rounded text-sm"
                  />
                </div>
              ) : (
                <p className="text-sm sm:text-base text-gray-600">Cancellation window closed</p>
              )}
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mt-4">
                <button
                  onClick={handleCancel}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  Cancel Assignment
                </button>
                {job.onMyWay && (
                  <button
                    onClick={handleViewMap}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-3 rounded text-base font-medium transition-colors flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447-2.724A1 1 0 0021 13.382V2.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
                      ></path>
                    </svg>
                    View Map
                  </button>
                )}
                <button
                  onClick={() => handleViewProfile(job.assignedWalker.id)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  View Profile
                </button>
                <button
                  onClick={() => handleSendMessage(job.assignedWalker.id)}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base">Status: {job.status.toUpperCase()}</p>
          )}
        </>
      )}
      {user.role === "walker" && (
        <div className="mt-4">
          {job.status === "assigned" && job.assignedWalker?.id === user.id ? (
            <div className="flex flex-col gap-4">
              <div className="bg-green-100 p-4 rounded-lg">
                <h3 className="text-sm sm:text-base font-semibold text-green-800">You are assigned to this job!</h3>
                <p className="text-sm sm:text-base mt-2">
                  <strong>Instructions:</strong> {job.description || "Follow owner’s instructions"}
                </p>
                <p className="text-sm sm:text-base mt-2">
                  <strong>Owner Contact:</strong>
                </p>
                <ul className="text-sm sm:text-base">
                  <li>Name: {job.owner?.name || "Unknown"}</li>
                  <li>Email: {job.owner?.email || "Not provided"}</li>
                </ul>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                {job.onMyWay ? (
                  <button
                    onClick={handleViewMap}
                    className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-3 rounded text-base font-medium transition-colors flex items-center justify-center"
                  >
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447-2.724A1 1 0 0021 13.382V2.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7"
                      ></path>
                    </svg>
                    View Map
                  </button>
                ) : (
                  <button
                    onClick={handleOnMyWay}
                    className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                  >
                    On My Way
                  </button>
                )}
                <button
                  onClick={handleMarkComplete}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 active:bg-green-800 text-white px-4 py-3 rounded text-base font-semibold transition-colors"
                >
                  Mark Complete
                </button>
                <button
                  onClick={handleCancel}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 active:bg-red-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  Cancel Assignment
                </button>
                <button
                  onClick={() => handleViewProfile(job.owner.id)}
                  className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  View Owner Profile
                </button>
                <button
                  onClick={() => handleSendMessage(job.owner.id)}
                  className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
                >
                  Send Message
                </button>
              </div>
            </div>
          ) : job.status === "closed" && job.assignedWalker?.id === user.id ? (
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="text-sm sm:text-base font-semibold text-blue-800">Job Completed!</h3>
              <p className="text-sm sm:text-base mt-2">Awaiting payment from the owner.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
              <button
                onClick={handleApply}
                className={`w-full sm:w-auto bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-3 rounded text-base font-semibold transition-colors ${
                  job.status !== "open" ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={job.status !== "open"}
              >
                Apply
              </button>
              <button
                onClick={() => handleViewProfile(job.owner.id)}
                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
              >
                View Owner Profile
              </button>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-sm text-gray-600">Note: All payments must be made via the platform (coming soon).</p>

      {isMapOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-md sm:max-w-lg">
            <h3 className="text-lg font-semibold mb-2">Track Job Progress</h3>
            {geoError && user.role === "walker" ? (
              <div className="text-red-600 text-sm mb-2">{geoError}</div>
            ) : !walkerPosition && user.role === "owner" ? (
              <div className="text-red-600 text-sm mb-2">Walker position not available.</div>
            ) : (
              <MapView />
            )}
            <button
              onClick={() => {
                setIsMapOpen(false);
                setWalkerPosition(null);
                setDistance(null);
                setEta(null);
              }}
              className="mt-4 w-full bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white px-4 py-3 rounded text-base font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* NEW: Cancellation confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Confirm Cancellation</h3>
            <p className="text-sm mb-4">Are you sure you want to cancel this assignment?</p>
            {user.role === "owner" && job.onMyWay && timeLeft <= 0 && (
              <p className="text-sm text-gray-600 mb-2">Reason: {cancelReason || "None provided"}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                onClick={confirmCancel}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetails;