import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../recoil/userAtom";

function Login() {
  const navigate = useNavigate();
  const setUser = useSetRecoilState(userAtom);
  const user = useRecoilValue(userAtom);

  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Optional: Set globally if you want all Axios requests to include credentials
  // axios.defaults.withCredentials = true;

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleChange = (e) => {
    setCredentials((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      toast.error("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);

      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/login`,
        credentials,
        { withCredentials: true } // ✅ Necessary for cookies to be sent/received
      );

      const { user: loggedInUser } = res.data;

      setUser(loggedInUser); // ✅ Set user in Recoil only
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-300 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"
        autoComplete="on"
      >
        <h2 className="text-3xl font-bold text-center text-blue-700 mb-6">
          Welcome Back 👋
        </h2>

        <div className="space-y-4">
          {/* Email Field */}
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="email"
            onChange={handleChange}
            required
          />

          {/* Password Field */}
          <div className="relative">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              autoComplete="current-password"
              onChange={handleChange}
              required
            />
            <span
              className="absolute right-3 top-2.5 text-sm text-blue-600 cursor-pointer select-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md mt-6 transition duration-300"
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-600 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Login;
