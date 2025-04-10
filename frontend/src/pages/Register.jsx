import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userAtom } from "../recoil/userAtom";

function Register() {
  const navigate = useNavigate();
  const setUser = useSetRecoilState(userAtom);
  const user = useRecoilValue(userAtom);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "owner",
    location: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validate = () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill all required fields.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/register`, formData);
      toast.success("Registration successful!");
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-200 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white rounded-xl shadow-lg p-8"
      >
        <h2 className="text-3xl font-bold text-center text-purple-700 mb-6">
          Create an Account 🐾
        </h2>

        <div className="space-y-4">
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            name="name"
            type="text"
            placeholder="Name"
            onChange={handleChange}
            required
          />

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
          />

          <div className="relative">
            <input
              className="w-full px-4 py-2 border border-gray-300 rounded-md pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              required
            />
            <span
              className="absolute right-3 top-2.5 text-sm text-purple-600 cursor-pointer select-none"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <select
            name="role"
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="owner">Pet Owner</option>
            <option value="walker">Pet Walker</option>
          </select>

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            name="location"
            type="text"
            placeholder="Location (optional)"
            onChange={handleChange}
          />
        </div>

        <button
          type="submit"
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-md mt-6 transition duration-300"
          disabled={loading}
        >
          {loading ? "Registering..." : "Register"}
        </button>

        <p className="mt-4 text-center text-gray-600 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-600 hover:underline font-medium">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Register;
