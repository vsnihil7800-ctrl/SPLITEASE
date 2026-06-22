import api from "./axios";

export const getGroupAnalyticsRequest = (groupId, granularity = "month") =>
  api.get(`/groups/${groupId}/analytics`, { params: { granularity } });
