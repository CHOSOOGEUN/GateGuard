/**
 * @file components/dashboard/AlertItem.tsx
 * @description 최신알림 개별 카드 컴포넌트
 *
 * ## 기능
 * - 미처리(pending/detected): 파란 [상세보기] + 파란 outline [오탐신고] 버튼
 * - 처리완료(confirmed/false_alarm): 파란 outline [기록보기] 버튼
 * - 심각도 뱃지: confidence 기반 (≥0.7 고위험 / <0.7 중간 / 처리 후 처리완료·오탐)
 * - 위치: camera embed 시 "역명 게이트명", 루트 직접 필드 시에도 동일 표시, 없으면 "CAM-XX"
 * - description 있으면 감지 유형 표시, 없으면 status 기반 기본 문구 fallback
 *
 * ## 주의사항
 * - isActive: pending → 상세보기·오탐신고 버튼 / confirmed | false_alarm → 기록보기 버튼
 * - getLocationLabel: camera 객체 embed 또는 루트 직접 필드(station_name/location) 모두 대응, 없으면 "CAM-XX" fallback
 *
 * ## TODO
 * - [ ] 카메라 썸네일 실제 CCTV 스냅샷 연동 (clip_url or 별도 API)
 *
 * ## 백엔드 확정 후 수정 필요
 * - description, appearance_tags 필드명 확정 필요
 */

import type { EventResponse } from "@/types";

interface AlertItemProps {
  event: EventResponse;
  onDetail: (event: EventResponse) => void;
  onFalseAlarm: (event: EventResponse) => void;
}

/** confidence 기반 심각도 뱃지. 처리 완료 상태는 별도 레이블 반환 */
function getSeverity(event: EventResponse): { label: string; color: string } {
  if (event.status === "confirmed")
    return { label: "처리완료", color: "bg-gray-100 text-gray-500" };
  if (event.status === "false_alarm")
    return { label: "오탐", color: "bg-gray-100 text-gray-400" };
  if ((event.confidence ?? 0) >= 0.7)
    return { label: "고위험", color: "bg-red-100 text-red-500" };
  return { label: "중간", color: "bg-yellow-100 text-yellow-600" };
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return `${d.getHours()}시 ${String(d.getMinutes()).padStart(2, "0")}분`;
}

/**
 * 위치 레이블: DashboardPage에서 카메라 API 조인 후 event.camera가 주입됨
 * 조인 실패 시 "CAM-XX" fallback
 */
function getLocationLabel(event: EventResponse): string {
  const station = event.camera?.station_name;
  const gate = event.camera?.location;
  if (station && gate) return `${station} ${gate}`;
  if (station) return station;
  return `CAM-${String(event.camera_id).padStart(2, "0")}`;
}

/** description 있으면 그 값, 없으면 status 기반 기본 문구 */
function getDescription(event: EventResponse): string {
  if (event.description) return event.description;
  if (event.status === "confirmed") return "무임승차 확인 처리됨";
  if (event.status === "false_alarm") return "오탐으로 처리됨";
  return "무임승차 의심 감지";
}

export default function AlertItem({
  event,
  onDetail,
  onFalseAlarm,
}: AlertItemProps) {
  const severity = getSeverity(event);
  const isActive = event.status === "pending";

  return (
    <div className="flex items-start sm:items-center gap-3 sm:gap-4 bg-white dark:bg-gray-800 rounded-2xl px-4 sm:px-5 py-4 shadow-sm">
      {/* 카메라 썸네일 */}
      <div className="relative shrink-0">
        <div className="w-16 h-16 rounded-xl bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
          CAM-{String(event.camera_id).padStart(2, "0")}
        </div>
        <span
          className={`absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${severity.color}`}
        >
          {severity.label}
        </span>
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0 pl-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-bold text-gray-900 dark:text-white text-sm">
            {getLocationLabel(event)}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatTime(event.timestamp)}
          </span>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1.5">{getDescription(event)}</p>
        <div className="flex gap-1.5 flex-wrap">
          {event.appearance_tags?.map((tag) => (
            <span
              key={tag}
              className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {event.confidence !== null && (
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              신뢰도 {Math.round((event.confidence ?? 0) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div className="flex flex-row sm:flex-col gap-1.5 shrink-0">
        {isActive ? (
          <>
            <button
              onClick={() => onDetail(event)}
              className="px-3 sm:px-4 py-1.5 rounded-full bg-[#4B73F7] text-white text-xs sm:text-sm font-medium hover:bg-[#3a62e6] transition"
            >
              상세보기
            </button>
            <button
              onClick={() => onFalseAlarm(event)}
              className="px-3 sm:px-4 py-1.5 rounded-full border border-[#4B73F7] text-[#4B73F7] text-xs sm:text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
            >
              오탐신고
            </button>
          </>
        ) : (
          <button
            onClick={() => onDetail(event)}
            className="px-3 sm:px-4 py-1.5 rounded-full border border-[#4B73F7] text-[#4B73F7] text-xs sm:text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition"
          >
            기록보기
          </button>
        )}
      </div>
    </div>
  );
}
