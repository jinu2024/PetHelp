import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_SOCKET_URL, {
  autoConnect: false,
  auth: {
    token: "", // Updated dynamically in Chat.jsx
  },
});

export default socket;