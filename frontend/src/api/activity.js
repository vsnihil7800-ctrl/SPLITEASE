import api from "./axios";
export const getGroupActivityRequest = (groupId) => api.get(`/activity/group/${groupId}`);
