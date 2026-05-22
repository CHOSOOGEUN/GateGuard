/**
 * @file api/events.ts
 * @description 이벤트(무임승차 감지) 관련 API
 *
 * ## 기능
 * - getEvents(params?)        GET /api/events/                 이벤트 목록 조회
 * - getEventById(id)          GET /api/events/{id}             이벤트 단건 조회
 * - getEventStats()           GET /api/events/stats            통계 카드 데이터
 * - getEventStatsByCamera()   GET /api/events/stats/by-camera  구간별 알림현황
 * - updateEventStatus(id)     PATCH /api/events/{id}/status    처리완료 상태 변경
 * - reportFalseAlarm(id)      POST /api/events/{id}/false-alarm 오탐신고
 *
 * ## 주의사항
 * - getEventStats / getEventStatsByCamera / reportFalseAlarm / updateEventStatus: 백엔드 M2 구현 예정, 실패 시 호출 측에서 fallback 처리
 *
 * ## 백엔드 확정 후 수정 필요
 * - reportFalseAlarm 요청 바디 필드명 ({ reason, memo? } 로 임시 처리)
 */

import api from "./axios";
import type { EventResponse, EventStats, CameraEventStats } from "@/types";

export const getEvents = (params?: {
  limit?: number;
  status?: string;
  camera_id?: number;
}) => api.get<EventResponse[]>("/api/events/", { params }).then((r) => r.data);

export const getEventById = (id: number) =>
  api.get<EventResponse>(`/api/events/${id}`).then((r) => r.data);

export const getEventStats = () =>
  api.get<EventStats>("/api/events/stats").then((r) => r.data);

export const getEventStatsByCamera = () =>
  api
    .get<CameraEventStats[]>("/api/events/stats/by-camera")
    .then((r) => r.data);

export const updateEventStatus = (id: number, status: string) =>
  api.patch(`/api/events/${id}/status`, { status }).then((r) => r.data);

export const reportFalseAlarm = (
  id: number,
  body: { reason: string; memo?: string },
) => api.post(`/api/events/${id}/false-alarm`, body).then((r) => r.data);
