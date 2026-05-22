/**
 * @file api/notifications.ts
 * @description 알림(오탐 신고 내역) 관련 API
 *
 * ## 기능
 * - getNotifications(params?)    GET /api/notifications/            알림 목록 조회
 * - markNotificationRead(id)     PATCH /api/notifications/{id}/read 읽음 처리
 *
 * ## 주의사항
 * - GET /api/notifications/ 는 인증 불필요 API
 *
 * ## 백엔드 확정 후 수정 필요
 * - NotificationResponse에 event 정보 embed 여부 확인 필요
 * - markNotificationRead 호출 시점 확인 필요 (항목 클릭 시? 자동?)
 */

import api from "./axios";
import type { NotificationResponse } from "@/types";

export const getNotifications = (params?: { unread_only?: boolean }) =>
  api
    .get<NotificationResponse[]>("/api/notifications/", { params })
    .then((r) => r.data);

export const markNotificationRead = (id: number) =>
  api.patch(`/api/notifications/${id}/read`).then((r) => r.data);
