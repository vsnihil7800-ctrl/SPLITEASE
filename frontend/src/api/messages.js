import api from "./axios";

export const getMessagesByGroupRequest = (groupId, params = {}) =>
  api.get(`/messages/group/${groupId}`, { params });
