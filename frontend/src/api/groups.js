import api from "./axios";

export const createGroupRequest = (data) => api.post("/groups", data);

export const getMyGroupsRequest = () => api.get("/groups");

export const getGroupByIdRequest = (id) => api.get(`/groups/${id}`);

export const joinGroupRequest = (inviteCode) =>
  api.post("/groups/join", { inviteCode });

export const getGroupBalancesRequest = (id) => api.get(`/groups/${id}/balances`);

export const getGroupSettlementsRequest = (id) =>
  api.get(`/groups/${id}/settlements`);
