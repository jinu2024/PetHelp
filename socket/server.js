require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const Message = require("./models/Message");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust if needed
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

// Connect MongoDB
connectDB();

io.on("connection", (socket) => {
  console.log("🟢 A user connected:", socket.id);

  socket.on("joinRoom", ({ userId }) => {
    socket.join(userId);
  });

  socket.on("sendMessage", async ({ sender, receiver, content }) => {
    const newMessage = new Message({ sender, receiver, content });
    await newMessage.save();

    io.to(receiver).emit("receiveMessage", {
      sender,
      content,
      timestamp: newMessage.createdAt,
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 6000;
server.listen(PORT, () => console.log(`💬 Socket Server running on port ${PORT}`));
