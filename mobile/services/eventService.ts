// 이벤트 API — 목록 조회 / 단건 조회 / 통계 / 구간별 통계 / 처리완료 / 오탐신고
import api from './api';
import type { EventResponse, EventStats, CameraEventStats } from '@/types';

export interface EventsQuery {
  limit?: number;
  offset?: number;
  status?: string;
  camera_id?: number;
  date_from?: string;  // YYYY-MM-DD
  date_to?: string;    // YYYY-MM-DD
  type?: string;       // 감지 유형 필터
  station?: string;    // 역이름 부분일치 (백엔드 PR #30)
  search?: string;     // 통합 검색 (백엔드 PR #26)
}

/** GET /api/events/ */
export const getEvents = (params?: EventsQuery) =>
  api.get<EventResponse[]>('/api/events/', { params }).then((r) => r.data);

/** GET /api/events/ + 총 건수 (X-Total-Count 헤더, 백엔드 PR #31) */
export const getEventsPaged = async (params?: EventsQuery) => {
  const res = await api.get<EventResponse[]>('/api/events/', { params });
  const totalHeader = res.headers['x-total-count'];
  const total = totalHeader ? Number(totalHeader) : res.data.length;
  return { items: res.data, total: Number.isFinite(total) ? total : res.data.length };
};

/** GET /api/events/{id} */
export const getEventById = (id: number) =>
  api.get<EventResponse>(`/api/events/${id}`).then((r) => r.data);

/** GET /api/events/stats — 오늘 발생/대기/처리완료/오탐 집계 */
export const getEventStats = () =>
  api.get<EventStats>('/api/events/stats').then((r) => r.data);

/** GET /api/events/stats/by-camera — 구간별 알림현황 */
export const getEventStatsByCamera = () =>
  api.get<CameraEventStats[]>('/api/events/stats/by-camera').then((r) => r.data);

/** GET /api/events/stats/by-type — 유형별 집계 (백엔드 PR #31) */
export interface EventTypeStat { event_type: string; count: number }
export const getEventStatsByType = () =>
  api.get<EventTypeStat[]>('/api/events/stats/by-type').then((r) => r.data);

/** GET /api/events/stats/hourly — 시간대(0~23)별 집계 (백엔드 PR #31) */
export interface HourlyStat { hour: number; count: number }
export const getEventStatsHourly = (params?: { date_from?: string; date_to?: string }) =>
  api.get<HourlyStat[]>('/api/events/stats/hourly', { params }).then((r) => r.data);

/** GET /api/events/stats/daily — 최근 N일 일자별 집계 (백엔드 PR #31) */
export interface DailyStat { day: string; count: number }
export const getEventStatsDaily = (days = 30) =>
  api.get<DailyStat[]>('/api/events/stats/daily', { params: { days } }).then((r) => r.data);

/** PATCH /api/events/{id}/status — 처리완료 */
export const updateEventStatus = (id: number, status: 'confirmed' | 'false_alarm') =>
  api.patch(`/api/events/${id}/status`, { status }).then((r) => r.data);

/** POST /api/events/{id}/false-alarm — 오탐신고 */
export const reportFalseAlarm = (id: number, body: { reason: string; memo?: string }) =>
  api.post(`/api/events/${id}/false-alarm`, body).then((r) => r.data);
