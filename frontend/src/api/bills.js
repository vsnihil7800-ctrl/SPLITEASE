import api from "./axios";

export const createBillRequest = (data) => api.post("/bills", data);

export const getBillsByGroupRequest = (groupId) =>
  api.get(`/bills/group/${groupId}`);

export const markBillPaidRequest = (billId, userId) =>
  api.patch(`/bills/${billId}/mark-paid`, { userId });

export const deleteBillRequest = (billId) => api.delete(`/bills/${billId}`);
