import api from "./axios";

export const registerRequest = (data) => api.post("/auth/register", data);

export const loginRequest = (data) => api.post("/auth/login", data);

export const meRequest = () => api.get("/auth/me");
