/**
 * @file components/dashboard/FalseAlarmList.tsx
 * @description 대시보드 최근 오탐 신고 목록 컴포넌트
 *
 * ## 기능
 * - GET /api/notifications/?unread_only=false 응답 최대 5건 표시
 * - read_at === null → 검토 중 (노란 아이콘) / read_at !== null → 오탐 확인 (초록 아이콘)
 * - loading 시 스켈레톤 / 빈 배열 시 안내 문구 표시
 *
 * ## 주의사항
 * - GET /api/notifications/ 는 인증 불필요 API
 *
 * ## TODO
 * - [ ] 전체보기 버튼 → 오탐 신고 전체 목록 페이지 라우팅 연결
 * - [ ] 항목 클릭 시 해당 이벤트 상세보기 Modal 연동
 *
 * ## 협의
 * - NotificationResponse에 event 정보 embed 여부 백엔드(조수근) 확인 필요
 */

import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { NotificationResponse } from "@/types";

interface FalseAlarmListProps {
  notifications: NotificationResponse[];
  loading?: boolean;
}

function formatRelativeTime(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  const timeStr = `${d.getHours()}시 ${String(d.getMinutes()).padStart(2, "0")}분`;
  if (diffDays === 0) return `오늘 ${timeStr}`;
  if (diffDays === 1) return `어제 ${timeStr}`;
  return `${diffDays}일 전 ${timeStr}`;
}

function getLabel(n: NotificationResponse): string {
  if (n.event?.camera) {
    return `${n.event.camera.station_name} CAM-${String(n.event.camera_id).padStart(2, "0")} - 오탐 신고`;
  }
  return `이벤트 #${n.event_id} - 오탐 신고`;
}

export default function FalseAlarmList({
  notifications,
  loading,
}: FalseAlarmListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white">최근 오탐 신고</h2>
        <Link to="/events" className="text-xs text-[#4B73F7] hover:underline">
          전체보기
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          최근 오탐 신고 내역이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.slice(0, 5).map((n) => {
            const isResolved = n.read_at !== null;
            return (
              <div key={n.id} className="flex items-start gap-3">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isResolved ? "bg-green-100" : "bg-yellow-100"
                  }`}
                >
                  {isResolved ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-tight">
                    {getLabel(n)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {formatRelativeTime(n.sent_at)} ·{" "}
                    {isResolved ? "오탐 확인" : "검토 중"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
