// 이벤트 API — 목록 조회 / 단건 조회 / 통계 / 구간별 통계 / 처리완료 / 오탐신고
import api from './api';
import type { EventResponse, EventStats, CameraEventStats } from '@/types';

/** GET /api/events/ */
export const getEvents = (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  camera_id?: number;
  date_from?: string;  // YYYY-MM-DD
  date_to?: string;    // YYYY-MM-DD
  type?: string;       // 감지 유형 필터
}) =>
  api.get<EventResponse[]>('/api/events/', { params }).then((r) => r.data);

/** GET /api/events/{id} */
export const getEventById = (id: number) =>
  api.get<EventResponse>(`/api/events/${id}`).then((r) => r.data);

/** GET /api/events/stats — 오늘 발생/대기/처리완료/오탐 집계 */
export const getEventStats = () =>
  api.get<EventStats>('/api/events/stats').then((r) => r.data);

/** GET /api/events/stats/by-camera — 구간별 알림현황 */
export const getEventStatsByCamera = () =>
  api.get<CameraEventStats[]>('/api/events/stats/by-camera').then((r) => r.data);

/** PATCH /api/events/{id}/status — 처리완료 */
export const updateEventStatus = (id: number, status: 'confirmed' | 'false_alarm') =>
  api.patch(`/api/events/${id}/status`, { status }).then((r) => r.data);

/** POST /api/events/{id}/false-alarm — 오탐신고 */
export const reportFalseAlarm = (id: number, body: { reason: string; memo?: string }) =>
  api.post(`/api/events/${id}/false-alarm`, body).then((r) => r.data);
