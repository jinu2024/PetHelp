import { useRecoilState } from "recoil";
import { userAtom } from "../recoil/userAtom";
import { Link, useNavigate } from "react-router-dom";
import { FaPaw, FaBars, FaPlus, FaClipboardList, FaBriefcase, FaEnvelope, FaUser, FaSearch, FaTimes } from "react-icons/fa";
import { useState } from "react";

const Navbar = () => {
  const [user, setUser] = useRecoilState(userAtom);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleLoginRedirect = () => {
    navigate("/login");
  };

  const role = user?.role || user?.data?.role || "";

  const ownerLinks = [
    { to: "/dashboard/post-job", label: "Post a Job", icon: <FaPlus /> },
    { to: "/dashboard/my-jobs", label: "My Job Listings", icon: <FaClipboardList /> },
    { to: "/dashboard/applications", label: "Applications", icon: <FaBriefcase /> },
    { to: "/dashboard/messages", label: "Messages", icon: <FaEnvelope /> },
    { to: "/dashboard/profile", label: "Profile", icon: <FaUser /> },
  ];

  const walkerLinks = [
    { to: "/dashboard/browse-jobs", label: "Browse Jobs", icon: <FaSearch /> },
    { to: "/dashboard/my-applications", label: "My Applications", icon: <FaClipboardList /> },
    { to: "/dashboard/messages", label: "Messages", icon: <FaEnvelope /> },
    { to: "/dashboard/profile", label: "Profile", icon: <FaUser /> },
  ];

  const links = role === "owner" ? ownerLinks : role === "walker" ? walkerLinks : [];

  return (
    <>
      {/* Navbar */}
      <div className="bg-blue-600 text-white px-4 py-4 flex justify-between items-center shadow-md">
        {/* Left: Hamburger + Logo */}
        <div className="flex items-center gap-4">
          <button
            className="md:hidden text-white text-xl"
            onClick={() => setIsSidebarOpen(true)}
          >
            <FaBars />
          </button>

          <div
            onClick={() => navigate("/dashboard")}
            className="cursor-pointer text-2xl font-bold tracking-wide flex items-center gap-2"
          >
            <FaPaw className="text-white text-3xl" />
            <span className="hidden sm:inline">PetHelp</span>
          </div>
        </div>

        {/* Right: User actions */}
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block">Hi, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100 text-sm"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={handleLoginRedirect}
            className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-gray-100 text-sm"
          >
            Login
          </button>
        )}
      </div>

      {/* Sidebar (Mobile Only) */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="fixed z-50 top-0 left-0 w-64 h-full bg-white shadow-md md:hidden transition-transform transform translate-x-0">
            {/* Close button */}
            <div className="flex justify-end p-4">
              <button onClick={() => setIsSidebarOpen(false)} className="text-xl">
                <FaTimes />
              </button>
            </div>
            {/* Sidebar content */}
            <div className="p-4">
              <p className="text-lg font-semibold mb-4">Menu</p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      onClick={() => setIsSidebarOpen(false)}
                      className="flex items-center gap-3 text-gray-800 hover:text-blue-600 transition-all"
                    >
                      <span>{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Navbar;
