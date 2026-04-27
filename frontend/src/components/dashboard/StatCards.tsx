/**
 * @file components/dashboard/StatCards.tsx
 * @description 대시보드 상단 통계 카드 4개 컴포넌트
 *
 * ## 기능
 * - EventStats 데이터를 받아 오늘 발생 / 확인 대기 / 처리 완료 / 오탐 신고 카드 렌더링
 * - loading 시 스켈레톤 4개 / stats=null 시 카운트 0으로 fallback
 *
 * ## 주의사항
 * - GET /api/events/stats 는 백엔드 M2 구현 예정, 전까지 0으로 표시
 *
 * ## 주의사항
 * - WebSocket NEW_EVENT 수신 시 today_count/pending_count 낙관적 업데이트는 DashboardPage에서 처리
 *
 * ## TODO
 * - [ ] 어제 대비 증감 표시 (백엔드 응답에 비교 데이터 포함 여부 확인 필요)
 */

import StatCard from "./StatCard";
import type { EventStats } from "@/types";

interface StatCardsProps {
  stats: EventStats | null;
  loading?: boolean;
}

export default function StatCards({ stats, loading }: StatCardsProps) {
  if (loading) {
    return (
      <div className="flex gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white rounded-2xl px-6 py-5 shadow-sm animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      count: stats?.today_total ?? 0,
      label: "오늘 발생",
      sub: "어제 대비 집계",
      color: "text-red-400",
      bg: "bg-red-50",
    },
    {
      count: stats?.pending ?? 0,
      label: "확인 대기",
      sub: "즉시 확인 필요",
      color: "text-yellow-400",
      bg: "bg-yellow-50",
    },
    {
      count: stats?.confirmed ?? 0,
      label: "처리 완료",
      sub: "오늘 처리",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      count: stats?.false_alarm ?? 0,
      label: "오탐 신고",
      sub: "검토 중",
      color: "text-gray-400",
      bg: "bg-gray-100",
    },
  ];

  return (
    <div className="flex gap-4">
      {cards.map((card) => (
        <StatCard key={card.label} {...card} />
      ))}
    </div>
  );
}
