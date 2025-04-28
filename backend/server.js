require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { sendMessage } = require("./controllers/socketController"); // Import socketController

const authRoutes = require("./routes/authRoutes");
const jobRoutes = require("./routes/jobRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const userRoutes = require("./routes/userRoutes");
const messageRoutes = require("./routes/messageRoutes");

// Initialize express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// In-memory store for connected users
const connectedUsers = new Map(); // { userId: { socketId, lastSeen } }

// Setup Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.IO Authentication
io.use((socket, next) => {
  const cookie = socket.handshake.headers.cookie;
  console.log("Socket auth attempt:", cookie); // Add logging
  if (!cookie) return next(new Error("Authentication error: No cookie"));
  const cookies = {};
  cookie.split(";").forEach((c) => {
    const [key, value] = c.trim().split("=");
    cookies[key] = value;
  });
  const token = cookies.token;
  if (!token) return next(new Error("Authentication error: No token"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { _id: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    console.error("JWT verification error:", err.message);
    next(new Error("Authentication error: Invalid token"));
  }
});

// Socket.IO Events
io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.user._id} (Socket ID: ${socket.id})`);
  socket.join(`user:${socket.user._id}`);

  // Update connected users
  connectedUsers.set(socket.user._id, { socketId: socket.id, lastSeen: null });
  io.emit("userStatus", {
    userId: socket.user._id,
    isOnline: true,
    lastSeen: null,
  });

  socket.on("sendMessage", (data) => {
    console.log(`📨 sendMessage received from ${socket.user._id}:`, data);
    sendMessage(io, socket, data); // Use socketController
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.user._id} (Socket ID: ${socket.id})`);
    const lastSeen = new Date();
    connectedUsers.set(socket.user._id, { socketId: null, lastSeen });
    io.emit("userStatus", {
      userId: socket.user._id,
      isOnline: false,
      lastSeen,
    });
    // Cleanup after 1 hour
    setTimeout(() => {
      if (connectedUsers.get(socket.user._id)?.socketId === null) {
        connectedUsers.delete(socket.user._id);
      }
    }, 3600000);
  });
});

// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

// Provide connectedUsers to routes
app.use((req, res, next) => {
  req.connectedUsers = connectedUsers;
  next();
});

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/user", userRoutes);
app.use("/api/messages", messageRoutes);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));