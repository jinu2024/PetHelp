import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/userAtom";
import {
  FaUser,
  FaClipboardList,
  FaSearch,
  FaPlus,
  FaBriefcase,
  FaEnvelope,
  FaTimes,
} from "react-icons/fa";

const Sidebar = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const user = useRecoilValue(userAtom);

  if (!user) return null;

  const role = user.role;

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

  const links = role === "owner" ? ownerLinks : walkerLinks;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 bg-white shadow-lg z-50
          transition-transform duration-300 w-64 p-4
          ${isOpen ? "translate-x-0" : "-translate-x-full"} 
          md:translate-x-0 md:block`}
        style={{ 
          top: "4rem", // Matches typical navbar height (adjust if your Navbar is different)
          height: "calc(100vh - 4rem)" // Full height minus navbar
        }}
      >
        {/* Close icon for mobile */}
        <div className="md:hidden flex justify-end mb-4 pt-4">
          <button 
            onClick={closeSidebar} 
            className="text-gray-600 hover:text-black text-xl"
          >
            <FaTimes />
          </button>
        </div>

        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ${
                  location.pathname === link.to
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-blue-100"
                }`}
              >
                <span className="text-lg">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Sidebar;