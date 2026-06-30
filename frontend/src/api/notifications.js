import api from "./axios";

export const getMyNotificationsRequest = (params = {}) =>
  api.get("/notifications", { params });

export const markNotificationReadRequest = (id) =>
  api.patch(`/notifications/${id}/read`);

export const markAllNotificationsReadRequest = () =>
  api.patch("/notifications/read-all");

// Web Push
export const getVapidPublicKeyRequest = () =>
  api.get("/notifications/vapid-public-key");

export const subscribePushRequest = (subscription) =>
  api.post("/notifications/push-subscribe", { subscription });

export const unsubscribePushRequest = (endpoint) =>
  api.post("/notifications/push-unsubscribe", { endpoint });

