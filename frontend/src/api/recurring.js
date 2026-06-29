import api from "./axios";
export const getGroupRecurringRequest = (groupId) => api.get(`/recurring/group/${groupId}`);
export const createRecurringRequest   = (data)    => api.post("/recurring", data);
export const deleteRecurringRequest   = (id)      => api.delete(`/recurring/${id}`);
