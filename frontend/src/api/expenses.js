import api from "./axios";

export const createExpenseRequest = (data) => api.post("/expenses", data);

export const getExpensesByGroupRequest = (groupId) =>
  api.get(`/expenses/group/${groupId}`);

export const deleteExpenseRequest = (id) => api.delete(`/expenses/${id}`);
