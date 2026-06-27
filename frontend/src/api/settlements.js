import api from "./axios";

export const getGroupBalancesRequest = (groupId) =>
  api.get(`/groups/${groupId}/balances`);

export const createSettlementRequest = (data) =>
  api.post("/settlements", data);

export const confirmSettlementRequest = (settlementId) =>
  api.patch(`/settlements/${settlementId}/confirm`);

export const rejectSettlementRequest = (settlementId) =>
  api.patch(`/settlements/${settlementId}/reject`);

export const markSettlementPaidRequest = (settlementId) =>
  api.patch(`/settlements/${settlementId}/mark-paid`);

export const getGroupSettlementsRequest = (groupId) =>
  api.get(`/settlements/group/${groupId}`);
