import { Outlet, useLocation, Navigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/userAtom";
import { useEffect } from "react";

const DashboardLayout = () => {
  const user = useRecoilValue(userAtom);
  const location = useLocation();

  // Debug current URL
  useEffect(() => {
    console.log("DashboardLayout - Current URL:", location.pathname);
  }, [location.pathname]);

  // Redirect to login if not authenticated
  if (!user.id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar, Header, etc. */}
      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;