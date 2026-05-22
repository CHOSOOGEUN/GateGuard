// 이벤트 표시용 유틸 — 상태 색상/라벨, 위험도 배지, 위치 텍스트, 구간별 카운트 색상
import { Colors } from '@/constants/colors';
import type { EventStatus, EventResponse } from '@/types';

export function getStatusColor(status: EventStatus): string {
  if (status === 'confirmed')   return Colors.success;
  if (status === 'false_alarm') return Colors.gray500;
  return Colors.danger; // pending
}

export function getStatusLabel(status: EventStatus): string {
  if (status === 'confirmed')   return '처리완료';
  if (status === 'false_alarm') return '오탐';
  return '미확인'; // pending
}

export function getStatusEnglish(status: EventStatus): string {
  if (status === 'confirmed')   return 'CONFIRMED';
  if (status === 'false_alarm') return 'FALSE ALARM';
  return 'UNCONFIRMED';
}

/** confidence 기준 위험도 배지 — 웹 getSeverityBadge와 동일 로직 */
export function getRiskBadge(event: EventResponse): { label: string; color: string; bg: string } {
  if (event.status === 'confirmed')
    return { label: '처리완료', color: Colors.success, bg: Colors.successLight };
  if (event.status === 'false_alarm')
    return { label: '오탐', color: Colors.gray500, bg: Colors.gray100 };
  if ((event.confidence ?? 0) >= 0.7)
    return { label: '고위험', color: Colors.danger, bg: Colors.dangerLight };
  return { label: '중간', color: Colors.warning, bg: Colors.warningLight };
}

/** 카메라 정보로 위치 텍스트 조합 */
export function getLocationText(event: EventResponse): string {
  if (event.camera) return `${event.camera.station_name} ${event.camera.location}`;
  return `카메라 #${event.camera_id}`;
}

export function getGateLabel(event: EventResponse): string {
  return event.camera?.location ?? `GATE ${event.camera_id}`;
}

/** 구간별 알림현황 색상 (count 기준) */
export function getCountColor(count: number): string {
  if (count >= 7) return Colors.danger;
  if (count >= 3) return Colors.warning;
  return Colors.success;
}
