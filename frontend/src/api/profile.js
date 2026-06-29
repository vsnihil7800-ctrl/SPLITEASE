import api from "./axios";
export const updateProfileRequest  = (data) => api.patch("/profile", data);
export const changePasswordRequest = (data) => api.patch("/profile/password", data);
