/**
 * @file types/index.ts
 * @description 앱 전체 공유 TypeScript 인터페이스 정의
 *
 * ## 주의사항
 * - description, appearance_tags 는 백엔드 응답에 포함 시 자동 활용, 없으면 fallback 처리
 * - camera, event 필드는 백엔드 embed 여부에 따라 활용
 *
 * ## 백엔드 확정 후 수정 필요
 * - description, appearance_tags 필드 포함 여부 확인 필요 (현재 optional로 선언, 없으면 fallback 처리)
 */

export interface CameraResponse {
  id: number;
  location: string;
  station_name: string;
  is_active: boolean;
}

// "pending" = 미처리, "confirmed" = 처리완료, "false_alarm" = 오탐
export type EventStatus = "pending" | "confirmed" | "false_alarm";

export interface EventResponse {
  id: number;
  camera_id: number;
  timestamp: string; // ISO 8601
  clip_url: string | null;
  track_id: number | null;
  confidence: number | null;
  status: EventStatus;
  description?: string; // AI 분석 설명 / 감지 유형 텍스트 (백엔드 응답에 포함 시 활용)
  appearance_tags?: string[]; // 인상착의 태그 (백엔드 응답에 포함 시 활용)
  camera?: CameraResponse; // 프론트에서 카메라 API 조인 후 주입 (백엔드 응답에는 camera_id만 있음)
  event_type?: string; // 감지유형 영문값 (tailgating | jump | crawling | unpaid | emergencydoor | normal | unknown)
  assigned_to?: string; // 담당자
  reason?: string | null; // 오탐신고 사유 (status=false_alarm 일 때만 값, 나머지 null)
  handled_by?: number | null; // 처리한 사용자 ID
  handled_at?: string | null; // 처리 완료 시각 ISO 8601 (평균 처리 시간 계산용)
}

// 백엔드 GET /api/events/stats 응답 필드명과 일치
export interface EventStats {
  today_total: number;
  pending: number;
  confirmed: number;
  false_alarm: number;
}

export interface CameraEventStats {
  camera_id: number;
  station_name: string;
  location: string;
  count: number;
}

export interface NotificationResponse {
  id: number;
  event_id: number;
  sent_at: string;
  read_at: string | null;
  event?: EventResponse; // 백엔드가 embed 해서 반환하는 경우
}
