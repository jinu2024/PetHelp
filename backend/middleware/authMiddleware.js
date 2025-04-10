const jwt = require("jsonwebtoken");
const User = require("../models/user");

const authMiddleware = async (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Access Denied: No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password"); 

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user; 
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
