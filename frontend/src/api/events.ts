import api from "./axios";
import type { EventResponse, EventStats, CameraEventStats } from "@/types";
import { normalizeEvent, normalizeStatusParam } from "./transform";

export const getEvents = (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  camera_id?: number;
  type?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}) => api.get<EventResponse[]>("/api/events/", { params: { ...params, status: normalizeStatusParam(params?.status) } }).then((r) => r.data.map(normalizeEvent));

export const getEventById = (id: number) =>
  api.get<EventResponse>(`/api/events/${id}`).then((r) => normalizeEvent(r.data));

export const getEventStats = () =>
  api.get<EventStats>("/api/events/stats").then((r) => r.data);

export const getEventStatsByCamera = () =>
  api
    .get<CameraEventStats[]>("/api/events/stats/by-camera")
    .then((r) => r.data);

export const updateEventStatus = (id: number, status: string) =>
  api.patch(`/api/events/${id}/status`, { status }).then((r) => r.data);

export const reportFalseAlarm = (id: number, body: { reason: string }) =>
  api.post(`/api/events/${id}/false-alarm`, body).then((r) => r.data);
