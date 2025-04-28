import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main container */}
      <div className="flex flex-col h-full">
        {/* Navbar section */}
        <div className="w-full flex-shrink-0">
          <Navbar />
        </div>

        {/* Content section with sidebar and main */}
        <div className="flex flex-1">
          {/* Sidebar - hidden on mobile */}
          <div className="hidden md:block w-64 flex-shrink-0">
            <Sidebar />
          </div>

          {/* Main content - full height with margin */}
          <div className="flex-1 m-10 p-4 md:p-6 bg-gray-100 overflow-auto h-screen">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;