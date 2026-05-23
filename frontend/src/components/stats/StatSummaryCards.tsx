import type { EventStats, EventResponse } from "@/types";

interface Props {
  stats: EventStats | null;
  events: EventResponse[];
  avgDaily: number | null;
  avgProcessMin: number | null;
  loading: boolean;
}

const cards = [
  {
    key: "today_total" as const,
    label: "누적 발생 건수",
    color: "text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    suffix: "건",
  },
  {
    key: "avg_daily" as const,
    label: "일평균 발생",
    color: "text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    suffix: "건",
  },
  {
    key: "false_alarm_rate" as const,
    label: "오탐율",
    color: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
    suffix: "%",
  },
  {
    key: "avg_process" as const,
    label: "평균 처리 시간",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    suffix: "분",
  },
];

export default function StatSummaryCards({
  stats,
  events,
  avgDaily,
  avgProcessMin,
  loading,
}: Props) {
  const falseAlarmRate =
    events.length > 0
      ? (
          (events.filter((e) => e.status === "false_alarm").length /
            events.length) *
          100
        ).toFixed(1)
      : "0.0";

  const getValue = (key: (typeof cards)[number]["key"]) => {
    if (key === "today_total")
      return events.length > 0
        ? events.length.toString()
        : stats
          ? stats.today_total.toString()
          : "—";
    if (key === "avg_daily")
      return avgDaily !== null ? avgDaily.toFixed(1) : "—";
    if (key === "false_alarm_rate") return falseAlarmRate;
    if (key === "avg_process")
      return avgProcessMin !== null ? avgProcessMin.toFixed(1) : "—";
    return "—";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.key}
            className="bg-white dark:bg-gray-800 rounded-2xl p-4 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div key={c.key} className={`${c.bg} rounded-2xl p-4`}>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{c.label}</p>
          <div className="flex items-end gap-1">
            <span className={`text-3xl font-bold ${c.color}`}>
              {getValue(c.key)}
            </span>
            {getValue(c.key) !== "—" && (
              <span className={`text-sm font-medium ${c.color} mb-0.5`}>
                {c.suffix}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
