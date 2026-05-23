//웹 프론트와 동일한 타입 정의

export interface CameraResponse {
  id: number;
  location: string;       // 게이트 위치 (예: "1번 게이트")
  station_name: string;   // 역 이름 (예: "수원역")
  is_active: boolean;
}

/** "pending" = 미처리 | "confirmed" = 처리완료 | "false_alarm" = 오탐 */
export type EventStatus = 'pending' | 'confirmed' | 'false_alarm';

export interface EventResponse {
  id: number;
  camera_id: number;
  timestamp: string;             // ISO 8601
  clip_url: string | null;
  track_id: number | null;
  confidence: number | null;     // 0~1 AI 신뢰도
  status: EventStatus;
  description?: string;          // AI 분석 설명 / 감지 유형
  appearance_tags?: string[];    // 인상착의 태그
  event_type?: string;           // 감지유형 텍스트
  assigned_to?: string;          // 담당자
  reason?: string;               // 오탐 신고 사유
  camera?: CameraResponse;       // 프론트에서 카메라 API 조인 후 주입
}

/** GET /api/events/stats 응답 (백엔드 필드명과 일치) */
export interface EventStats {
  today_total: number;
  pending: number;
  confirmed: number;
  false_alarm: number;
}

/** GET /api/events/stats/by-camera 응답 */
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
  event?: EventResponse;
}
