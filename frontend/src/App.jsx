import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { useRecoilState } from "recoil";
import { userAtom } from "./recoil/userAtom";
import axios from "axios";

import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardLayout from "./layouts/DashboardLayout";
import PostJob from "./pages/dashboard/PostJob";
import MyJobListings from "./pages/dashboard/MyJobListings";
import Applications from "./pages/dashboard/Applications";
import BrowseJobs from "./pages/dashboard/BrowseJobs";
import MyApplications from "./pages/dashboard/MyApplications";
import Messages from "./pages/dashboard/Messages";
import Profile from "./pages/dashboard/Profile";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
  const [user, setUser] = useRecoilState(userAtom);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const res = await axios.get(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/me`,
          { withCredentials: true }
        );
        setUser(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      } catch (err) {
        setUser(null);
        localStorage.removeItem("user");
      }
    };

    validateSession();
  }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="post-job" element={<PostJob />} />
          <Route path="my-jobs" element={<MyJobListings />} />
          <Route path="applications" element={<Applications />} />
          <Route path="browse-jobs" element={<BrowseJobs />} />
          <Route path="my-applications" element={<MyApplications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>

      <ToastContainer position="top-right" autoClose={3000} />
    </>
  );
}

export default App;
