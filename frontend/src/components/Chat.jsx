import { useEffect, useState, useRef } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../recoil/userAtom";
import io from "socket.io-client";
import axios from "axios";
import { toast } from "react-toastify";
import { IoArrowBack } from "react-icons/io5"; // using react-icons

const Chat = ({ conversation, recipientUser, currentUser, onBack, onNewMessageSent }) => {
  const user = useRecoilValue(userAtom);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const tempMessageIds = useRef(new Map()); 

  const receiverId = conversation?.user._id || recipientUser?._id;

  // Setup socket and fetch initial messages
  useEffect(() => {
    if (!receiverId || !user.id) {
      console.log("Skipping socket setup: missing receiverId or userId", { receiverId, userId: user.id });
      return;
    }

    console.log("Initializing socket for receiverId:", receiverId);
    socketRef.current = io(import.meta.env.VITE_BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on("connect", () => {
      console.log("Socket connected");
    });

    socketRef.current.on("connect_error", (error) => {
      console.error("Socket connect error:", error.message);
      toast.error("Failed to connect to chat server");
    });

    socketRef.current.on("error", (error) => {
      console.error("Socket error:", error.message);
      toast.error(error.message);
    });

    socketRef.current.on("receiveMessage", (message) => {
      console.log("Received message:", message);

      if (
        (message.sender._id === receiverId && message.receiver._id === user.id) ||
        (message.sender._id === user.id && message.receiver._id === receiverId)
      ) {
        const tempId = message.tempId || [...tempMessageIds.current.keys()].find(
          (key) => tempMessageIds.current.get(key) === message._id
        );

        if (tempId) {
          setMessages((prev) =>
            prev.map((msg) => (msg._id === tempId ? { ...message, _id: message._id } : msg))
          );
          tempMessageIds.current.delete(tempId);
        } else {
          setMessages((prev) => {
            if (prev.some((msg) => msg._id === message._id)) {
              return prev;
            }
            return [...prev, message];
          });
        }

        if (!conversation && message.sender._id !== user.id) {
          onNewMessageSent();
        }
      }
    });

    const fetchMessages = async () => {
      try {
        if (conversation) {
          const res = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/messages/${receiverId}`,
            { withCredentials: true }
          );
          console.log("Fetched messages:", res.data);
          setMessages(res.data.messages || []);
        } else {
          setMessages([]);
        }
      } catch (error) {
        console.error("Fetch Messages Error:", error.response?.status, error.response?.data);
        toast.error("Failed to load messages");
      }
    };
    fetchMessages();

    return () => {
      console.log("Disconnecting socket");
      socketRef.current?.disconnect();
    };
  }, [receiverId, user.id, conversation?.user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !receiverId || !socketRef.current) {
      console.error("Cannot send message:", { newMessage, receiverId, socketInitialized: !!socketRef.current });
      toast.error("Cannot send message. Please try again.");
      return;
    }

    console.log(`Sending message to ${receiverId}: ${newMessage}`);
    const tempId = Math.random().toString(36).substr(2, 9);

    const tempMessage = {
      _id: tempId,
      sender: { _id: user.id, name: user.name },
      receiver: { _id: receiverId },
      content: newMessage,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      if (prev.some((msg) => msg._id === tempId)) {
        return prev;
      }
      return [...prev, tempMessage];
    });

    socketRef.current.emit("sendMessage", {
      receiverId,
      content: newMessage,
      tempId,
    });

    tempMessageIds.current.set(tempId, tempId);

    if (!conversation) {
      onNewMessageSent();
    }

    setNewMessage("");
  };

  if (!receiverId) {
    return (
      <div className="flex-1 p-4">
        <p className="text-gray-600">Select a conversation or recipient to start chatting.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Header */}
      <div className="p-4 border-b flex items-center sticky top-0 bg-white z-10">
        <button onClick={onBack} className="mr-3 text-purple-600 hover:text-purple-800 text-2xl">
          <IoArrowBack />
        </button>
        <h3 className="text-lg font-semibold">
          {conversation?.user.name || recipientUser?.name || "Unknown"}
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-100">
        {messages.map((msg) => (
          <div
            key={msg._id}
            className={`mb-4 flex ${msg.sender._id === user.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[70%] px-4 py-2 rounded-2xl ${
                msg.sender._id === user.id
                  ? "bg-purple-500 text-white rounded-br-none"
                  : "bg-white text-gray-900 rounded-bl-none"
              }`}
            >
              <p>{msg.content}</p>
              {msg.image && (
                <img src={msg.image} alt="Message" className="mt-2 max-w-full rounded" />
              )}
              <p className="text-xs mt-1 opacity-70 text-right">
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSendMessage}
            className="bg-purple-600 text-white px-4 py-2 rounded-full"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  );
};

export default Chat;
