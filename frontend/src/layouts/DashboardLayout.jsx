import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <div className="flex flex-1 relative">
        {/* Sidebar only visible on desktop */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <main className="flex-1 p-4 md:p-6 bg-gray-100 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
