import { createContext, useEffect, useState } from "react";
import { loginRequest, registerRequest, meRequest } from "../api/auth";

// eslint-disable-next-line react-refresh/only-export-components -- standard context+provider pattern
export const AuthContext = createContext(null);

const TOKEN_KEY = "splitease_token";
const USER_KEY = "splitease_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // On first load, restore session from localStorage and verify the
  // token is still valid against the backend.
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      const cachedUser = localStorage.getItem(USER_KEY);

      if (!token) {
        setLoading(false);
        return;
      }

      if (cachedUser) {
        try {
          setUser(JSON.parse(cachedUser));
        } catch {
          // ignore malformed cache
        }
      }

      try {
        const res = await meRequest();
        setUser(res.data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async ({ email, password }) => {
    setError("");
    try {
      const res = await loginRequest({ email, password });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't sign in. Please try again.";
      setError(message);
      return { success: false, message };
    }
  };

  const register = async ({ name, email, password, upiId }) => {
    setError("");
    try {
      const res = await registerRequest({ name, email, password, upiId });
      localStorage.setItem(TOKEN_KEY, res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Couldn't create your account. Please try again.";
      setError(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const value = { user, setUser, loading, error, setError, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
