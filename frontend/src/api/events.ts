import api from "./axios";
import type {
  EventResponse,
  EventStats,
  CameraEventStats,
  EventTypeStat,
  HourlyStat,
  DailyStat,
  EventsPagedResult,
} from "@/types";

export interface EventsQuery {
  limit?: number;
  offset?: number;
  status?: string;
  camera_id?: number;
  type?: string;
  station?: string; // 서버사이드 역이름 부분일치 (PR #30)
  date_from?: string;
  date_to?: string;
  search?: string;
}

export const getEvents = (params?: EventsQuery) =>
  api.get<EventResponse[]>("/api/events/", { params }).then((r) => r.data);

// X-Total-Count 헤더까지 같이 받는 버전 — 페이지네이션 메타 필요할 때 사용 (PR #31)
export const getEventsPaged = async (params?: EventsQuery): Promise<EventsPagedResult> => {
  const res = await api.get<EventResponse[]>("/api/events/", { params });
  const totalHeader = res.headers["x-total-count"];
  const total = totalHeader ? Number(totalHeader) : res.data.length;
  return { items: res.data, total: Number.isFinite(total) ? total : res.data.length };
};

export const getEventById = (id: number) =>
  api.get<EventResponse>(`/api/events/${id}`).then((r) => r.data);

export const getEventStats = () =>
  api.get<EventStats>("/api/events/stats").then((r) => r.data);

export const getEventStatsByCamera = () =>
  api
    .get<CameraEventStats[]>("/api/events/stats/by-camera")
    .then((r) => r.data);

// 서버 통계 3종 (PR #31) — StatsPage 가 클라 1000건 집계 대신 사용
export const getEventStatsByType = () =>
  api.get<EventTypeStat[]>("/api/events/stats/by-type").then((r) => r.data);

export const getEventStatsHourly = (params?: { date_from?: string; date_to?: string }) =>
  api.get<HourlyStat[]>("/api/events/stats/hourly", { params }).then((r) => r.data);

export const getEventStatsDaily = (days = 30) =>
  api.get<DailyStat[]>("/api/events/stats/daily", { params: { days } }).then((r) => r.data);

export const updateEventStatus = (id: number, status: string) =>
  api.patch(`/api/events/${id}/status`, { status }).then((r) => r.data);

export const reportFalseAlarm = (id: number, body: { reason: string }) =>
  api.post(`/api/events/${id}/false-alarm`, body).then((r) => r.data);
