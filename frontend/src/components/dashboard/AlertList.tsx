/**
 * @file components/dashboard/AlertList.tsx
 * @description 대시보드 최신알림 목록 컴포넌트
 *
 * ## 기능
 * - events 배열 렌더링 (데이터 페칭은 DashboardPage에서 담당)
 * - loading 시 스켈레톤 3개 / 빈 배열 시 안내 문구 표시
 *
 * ## 주의사항
 * - 전체보기 버튼은 Link to="/events"로 연결됨
 * - 최대 10건 표시 (DashboardPage에서 limit=10 페칭 + WebSocket .slice(0, 10) 유지)
 */

import { Link } from "react-router-dom";
import AlertItem from "./AlertItem";
import type { EventResponse } from "@/types";

interface AlertListProps {
  events: EventResponse[];
  loading?: boolean;
  unconfirmedCount: number;
  onDetail: (event: EventResponse) => void;
  onFalseAlarm: (event: EventResponse) => void;
}

export default function AlertList({
  events,
  loading,
  unconfirmedCount,
  onDetail,
  onFalseAlarm,
}: AlertListProps) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">최신알림</h2>
          {unconfirmedCount > 0 && (
            <span className="text-sm text-gray-400">
              미확인 {unconfirmedCount}건
            </span>
          )}
        </div>
        <Link to="/events" className="text-sm text-[#4B73F7] hover:underline">
          전체보기
        </Link>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl px-5 py-4 shadow-sm animate-pulse h-24"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 py-12 text-center">
          감지된 이벤트가 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <AlertItem
              key={event.id}
              event={event}
              onDetail={onDetail}
              onFalseAlarm={onFalseAlarm}
            />
          ))}
        </div>
      )}
    </div>
  );
}
