import { Navigate } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "./recoil/userAtom";

const ProtectedRoute = ({ children }) => {
  const user = useRecoilValue(userAtom);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;
