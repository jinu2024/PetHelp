import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useRecoilState } from "recoil";
import { userAtom } from "./recoil/userAtom";
import axios from "axios";
import io from "socket.io-client";
import { toast } from "react-toastify";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./layouts/DashboardLayout";
import PostJob from "./pages/dashboard/PostJob";
import MyJobListings from "./pages/dashboard/MyJobListings";
import BrowseJobs from "./pages/dashboard/BrowseJobs";
import CurrentJobs from "./pages/dashboard/CurrentJobs";
import Messages from "./pages/dashboard/Messages";
import Profile from "./pages/dashboard/Profile";
import JobDetailsPage from "./pages/JobDetailsPage";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AssignedJobs from "./pages/dashboard/AssignedJobs";

function App() {
  const [user, setUser] = useRecoilState(userAtom);

  // Validate session
  useEffect(() => {
    const validateSession = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/me`,
          { withCredentials: true }
        );
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        console.log("App.jsx - Session validated, user:", res.data.user);
      } catch (err) {
        setUser(null);
        localStorage.removeItem("user");
        console.error("App.jsx - Session validation error:", err.message);
      }
    };

    validateSession();
  }, [setUser]);

  // Global Socket.io listener for notifications
  useEffect(() => {
    let socket;
    if (user?.id) {
      socket = io(import.meta.env.VITE_BACKEND_URL, {
        withCredentials: true,
        query: { userId: user.id },
      });

      socket.on("connect", () => {
        console.log(`App.jsx - Socket connected: ${socket.id}`);
      });

      socket.on("connect_error", (err) => {
        console.error("App.jsx - Socket connection error:", err.message);
        toast.error("Failed to connect to notifications");
      });

      socket.on("walkerOnMyWay", (data) => {
        console.log("App.jsx - walkerOnMyWay event:", data);
        if (user.role === "owner") {
          toast.info(data.message || `${data.walkerName} is on the way to your job!`);
        }
      });

      return () => {
        if (socket) {
          socket.disconnect();
          console.log("App.jsx - Socket disconnected");
        }
      };
    }
  }, [user?.id, user?.role]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="post-job" element={<PostJob />} />
          <Route path="my-jobs" element={<MyJobListings />} />
          <Route path="assigned-jobs" element={<AssignedJobs />} />
          <Route path="browse-jobs" element={<BrowseJobs />} />
          <Route path="current-jobs" element={<CurrentJobs />} />
          <Route path="messages" element={<Messages />} />
          <Route path="profile/:userId?" element={<Profile />} />
          <Route path="job/:id" element={<JobDetailsPage />} />
        </Route>
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;