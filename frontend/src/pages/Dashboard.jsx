import React from "react";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/userAtom";

const DashboardLayout = () => {
  const user = useRecoilValue(userAtom);

  if (!user) return null; // or show a loading spinner / redirect

  return (
    <div className="flex">
      <Sidebar /> {/* No need to pass role anymore */}
      <div className="flex-1 p-6 bg-gray-100 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;
