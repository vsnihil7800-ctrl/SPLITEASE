import axios from "axios";

// In dev, Vite proxies /api -> http://localhost:5000 (see vite.config.js)
// In production, set VITE_API_URL to your deployed backend URL (e.g. Render URL)
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
});

// Attach JWT token to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("splitease_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend says the token is invalid/expired, clear it so the app
// doesn't get stuck in a broken logged-in state
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("splitease_token");
      localStorage.removeItem("splitease_user");
    }
    return Promise.reject(error);
  }
);

export default api;
