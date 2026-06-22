import { io } from "socket.io-client";

// Derives the bare backend origin for the Socket.io connection.
// VITE_API_URL (when set) points at the REST API and includes a trailing
// /api, e.g. "https://splitease-stay-backend.onrender.com/api" — Socket.io
// needs the origin without that suffix. VITE_SOCKET_URL can override this
// directly if the two ever diverge (e.g. different subdomain/port).
function resolveSocketUrl() {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) return apiUrl.replace(/\/api\/?$/, "");
  return "http://localhost:5000"; // local dev default — matches backend PORT
}

let socket = null;

// Creates (or returns the existing) authenticated socket connection.
// The JWT is sent once at handshake time via `auth`, verified server-side
// in server.js's io.use() middleware — not re-sent per event.
export function getSocket(token) {
  if (socket && socket.connected) return socket;

  if (socket) {
    socket.disconnect();
  }

  socket = io(resolveSocketUrl(), {
    auth: { token },
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
