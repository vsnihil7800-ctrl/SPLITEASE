import api from "./axios";

export const getMyNotificationsRequest = (params = {}) =>
  api.get("/notifications", { params });

export const markNotificationReadRequest = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsReadRequest = () =>
  api.patch("/notifications/read-all");
