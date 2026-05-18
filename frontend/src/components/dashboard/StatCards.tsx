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
            className="flex-1 bg-white dark:bg-gray-800 rounded-2xl px-3 lg:px-6 py-4 lg:py-5 shadow-sm animate-pulse h-16 lg:h-24"
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
