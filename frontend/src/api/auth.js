import api from "./axios";

export const registerRequest = (data) => api.post("/auth/register", data);
export const loginRequest = (data) => api.post("/auth/login", data);
export const meRequest = () => api.get("/auth/me");

export const forgotPasswordRequest = (email) =>
  api.post("/auth/forgot-password", { email });

export const resetPasswordRequest = (token, password) =>
  api.post("/auth/reset-password", { token, password });

export const verifyEmailRequest = (token) =>
  api.get(`/auth/verify-email?token=${token}`);

export const resendVerificationRequest = (email) =>
  api.post("/auth/resend-verification", { email });
