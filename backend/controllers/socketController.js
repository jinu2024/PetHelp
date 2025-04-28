const Message = require("../models/message");
const User = require("../models/user");
const sanitizeHtml = require("sanitize-html");
const mongoose = require("mongoose");

const sendMessage = async (io, socket, data) => {
  try {
    console.log("Processing sendMessage with data:", data);
    const { receiverId, content, image, tempId } = data;

    if (!receiverId || (!content && !image)) {
      console.error("Invalid data:", { receiverId, content, image });
      return socket.emit("error", { message: "Receiver ID and content/image are required" });
    }

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      console.error("Invalid receiverId format:", receiverId);
      return socket.emit("error", { message: "Invalid receiver ID" });
    }

    if (mongoose.connection.readyState !== 1) {
      console.error("MongoDB not connected, state:", mongoose.connection.readyState);
      return socket.emit("error", { message: "Database connection error" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      console.error("Receiver not found:", receiverId);
      return socket.emit("error", { message: "Receiver not found" });
    }

    const message = new Message({
      sender: socket.user._id,
      receiver: receiverId,
      content: content ? sanitizeHtml(content) : "",
      image,
      read: false,
    });

    await message.save();
    console.log("Message saved:", message);

    const populatedMessage = await Message.findById(message._id)
      .populate("sender", "name profilePic _id")
      .populate("receiver", "name profilePic _id");
    console.log("Populated message:", populatedMessage);

    // Include tempId in the emitted message
    const messageWithTempId = { ...populatedMessage.toObject(), tempId };

    // Emit to receiver
    io.to(`user:${receiverId}`).emit("receiveMessage", messageWithTempId);
    // Emit to sender
    socket.emit("receiveMessage", messageWithTempId);
  } catch (error) {
    console.error("Send Message Error:", error.message, error.stack);
    socket.emit("error", { message: "Failed to send message: " + error.message });
  }
};

module.exports = { sendMessage };