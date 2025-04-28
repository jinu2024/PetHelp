import { useState, useEffect, useMemo } from "react";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/userAtom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Chat from "../../components/Chat";
import { io } from "socket.io-client";
import { formatDistanceToNow, parseISO } from "date-fns";

function Messages() {
  const user = useRecoilValue(userAtom);
  const navigate = useNavigate();
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [recipientUser, setRecipientUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [socket, setSocket] = useState(null);

  // Cache recipientId
  const recipientId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("recipient");
  }, [location.search]);

  useEffect(() => {
    if (!user.id) {
      navigate("/login");
      return;
    }

    // Initialize Socket.IO
    const newSocket = io(import.meta.env.VITE_BACKEND_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to socket server");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Socket connect error:", error.message, error.stack);
      toast.error("Failed to connect to chat server");
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error.message);
      toast.error(error.message);
    });

    // Listen for user status updates
    newSocket.on("userStatus", ({ userId, isOnline, lastSeen }) => {
      console.log("Received userStatus:", { userId, isOnline, lastSeen });
      setUsers((prev) =>
        prev.map((u) =>
          u._id === userId ? { ...u, isOnline, lastSeen } : u
        )
      );
    });

    // Listen for new messages to update unread counts and conversation list
    newSocket.on("receiveMessage", (message) => {
      console.log("Received message in Messages:", message);

      // Determine the conversation partner
      const partnerId =
        message.sender._id === user.id
          ? message.receiver._id
          : message.sender._id;

      // Update conversations to reflect the latest message
      setConversations((prev) => {
        const existingConv = prev.find((conv) => conv.user._id === partnerId);
        if (!existingConv) {
          // Add new conversation optimistically
          return [
            {
              user: {
                _id: partnerId,
                name:
                  message.sender._id === user.id
                    ? message.receiver.name
                    : message.sender.name,
              },
              lastMessage: message.content,
              timestamp: message.createdAt,
            },
            ...prev,
          ];
        }
        return prev.map((conv) =>
          conv.user._id === partnerId
            ? {
                ...conv,
                lastMessage: message.content,
                timestamp: message.createdAt,
              }
            : conv
        );
      });

      // Update unread counts for received messages
      if (
        message?.receiver?._id === user.id &&
        message?.sender?._id !== user.id && // Exclude own messages
        !message.read &&
        message?.sender?._id &&
        selectedConversation?.user._id !== message.sender._id // Don't increment if conversation is open
      ) {
        console.log("Updating unread count for sender:", message.sender._id);
        setUnreadCounts((prev) => ({
          ...prev,
          [message.sender._id]: (prev[message.sender._id] || 0) + 1,
        }));
      }
    });

    return () => {
      console.log("Disconnecting socket");
      newSocket.disconnect();
    };
  }, [user.id, navigate, selectedConversation]);

  useEffect(() => {
    if (!user.id) return;

    const fetchConversationsAndUnread = async () => {
      try {
        setLoading(true);
        const [conversationsRes, usersRes] = await Promise.all([
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/messages/conversations`, {
            withCredentials: true,
          }),
          axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user`, {
            withCredentials: true,
          }),
        ]);

        // Fetch user statuses and unread counts
        const usersWithStatus = await Promise.all(
          usersRes.data.map(async (u) => {
            const [statusRes, unreadRes] = await Promise.all([
              axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/user/status/${u._id}`,
                { withCredentials: true }
              ),
              axios.get(
                `${import.meta.env.VITE_BACKEND_URL}/api/messages/unread/${u._id}`,
                { withCredentials: true }
              ),
            ]);
            return { ...u, ...statusRes.data, unreadCount: unreadRes.data.count };
          })
        );

        setConversations(conversationsRes.data.conversations || []);
        setUsers(usersWithStatus);
        setUnreadCounts(
          usersWithStatus.reduce(
            (acc, u) => ({ ...acc, [u._id]: u.unreadCount }),
            {}
          )
        );
      } catch (err) {
        console.error("Fetch Data Error:", err.response?.status, err.response?.data);
        toast.error("Failed to load conversations or users");
      } finally {
        setLoading(false);
      }
    };

    fetchConversationsAndUnread();
  }, [user.id]);

  useEffect(() => {
    if (!recipientId || recipientId === user.id) {
      setSelectedConversation(null);
      setRecipientUser(null);
      return;
    }

    const existingConversation = conversations.find(
      (conv) => conv.user._id === recipientId
    );
    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setRecipientUser(null);
    } else if (!recipientUser || recipientUser._id !== recipientId) {
      const fetchRecipient = async () => {
        try {
          const res = await axios.get(
            `${import.meta.env.VITE_BACKEND_URL}/api/user/${recipientId}`,
            { withCredentials: true }
          );
          console.log("Fetched recipient:", res.data);
          setRecipientUser(res.data);
          setSelectedConversation(null);
        } catch (err) {
          console.error("Fetch Recipient Error:", err.response?.status, err.response?.data);
          toast.error("Failed to fetch recipient details");
        }
      };
      fetchRecipient();
    }
  }, [recipientId, user.id, conversations, recipientUser]);

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setRecipientUser(null);
    navigate(`/dashboard/messages?recipient=${conversation.user._id}`);

    // Mark messages as read
    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/mark-read/${conversation.user._id}`,
        {},
        { withCredentials: true }
      );
      // Reset unread count for the selected conversation
      setUnreadCounts((prev) => ({
        ...prev,
        [conversation.user._id]: 0,
      }));
    } catch (err) {
      console.error("Mark Read Error:", err.response?.status, err.response?.data);
      toast.error("Failed to mark messages as read");
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setRecipientUser(null);
    navigate("/dashboard/messages");
  };

  const handleNewMessageSent = async () => {
    if (selectedConversation) {
      // Conversation already exists, no need to refresh
      return;
    }
    try {
      console.log("Refreshing conversations after new message");
      const res = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/messages/conversations`,
        { withCredentials: true }
      );
      console.log("Refreshed conversations:", res.data);
      setConversations(res.data.conversations || []);
      const newConversation = res.data.conversations.find(
        (conv) => conv.user._id === recipientUser?._id
      );
      if (newConversation) {
        setSelectedConversation(newConversation);
        setRecipientUser(null);
        navigate(`/dashboard/messages?recipient=${newConversation.user._id}`);
      }
    } catch (err) {
      console.error("Refresh Conversations Error:", err.response?.status, err.response?.data);
      toast.error("Failed to refresh conversations");
    }
  };

  const handleStartNewChat = () => {
    // Navigate to a page or show a modal to select a new recipient
    navigate("/dashboard/messages?new=true");
  };

  if (!user.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-100 to-purple-200 px-2 sm:px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 text-center transform transition-all hover:scale-105">
          <p className="text-gray-600 mb-4">Please log in to view messages.</p>
          <Link
            to="/login"
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm transition-colors"
          >
            Log In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-200 px-2 sm:px-4 py-6 flex flex-col">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-4 sm:p-6 w-full">
        {selectedConversation || recipientUser ? (
          <Chat
            conversation={selectedConversation}
            recipientUser={recipientUser}
            currentUser={user}
            onBack={handleBack}
            onNewMessageSent={handleNewMessageSent}
          />
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-purple-700">Conversations</h2>
              <button
                onClick={handleStartNewChat}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm transition-colors flex items-center gap-2"
              >
                <svg
                  className="w-4 sm:w-5 h-4 sm:h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Chat
              </button>
            </div>
            {loading ? (
              <div className="text-center">
                <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-gray-600 text-center text-sm sm:text-base">No conversations yet. Start a new chat!</p>
            ) : (
              <ul className="space-y-2 sm:space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {conversations.map((conversation) => {
                  const convUser = users.find((u) => u._id === conversation.user._id) || conversation.user;
                  const isSelected = selectedConversation?.user._id === conversation.user._id;
                  const hasUnread = unreadCounts[conversation.user._id] > 0;
                  return (
                    <li
                      key={conversation.user._id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`flex items-center p-3 sm:p-4 rounded-lg cursor-pointer transition-all duration-200 hover:bg-purple-50 hover:shadow-md ${
                        isSelected ? "bg-purple-100" : ""
                      } ${hasUnread ? "shadow-lg bg-red-50" : ""}`}
                      aria-label={`Select conversation with ${convUser.name}`}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === "Enter" && handleSelectConversation(conversation)}
                    >
                      <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full overflow-hidden mr-3 sm:mr-4 relative">
                        {convUser.profilePic ? (
                          <img
                            src={convUser.profilePic}
                            alt={convUser.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-lg sm:text-xl font-semibold">
                            {convUser.name.charAt(0)}
                          </div>
                        )}
                        {convUser.isOnline && (
                          <span className="absolute bottom-0 right-0 w-3 sm:w-3.5 h-3 sm:h-3.5 bg-green-400 rounded-full border-2 border-white animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-800 text-base sm:text-lg truncate">
                            {convUser.name}
                          </p>
                          {hasUnread && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                              {unreadCounts[conversation.user._id]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500">
                            {conversation.timestamp
                              ? formatDistanceToNow(parseISO(conversation.timestamp), {
                                  addSuffix: true,
                                })
                              : "Unknown"}
                          </p>
                          <p
                            className={`text-xs ${
                              convUser.isOnline ? "text-green-500" : "text-gray-400"
                            }`}
                          >
                            {convUser.isOnline
                              ? "Online"
                              : convUser.lastSeen
                              ? `Last seen: ${formatDistanceToNow(parseISO(convUser.lastSeen), {
                                  addSuffix: true,
                                })}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Messages;