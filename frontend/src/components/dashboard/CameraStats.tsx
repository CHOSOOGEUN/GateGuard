import type { CameraEventStats } from "@/types";

interface CameraStatsProps {
  data: CameraEventStats[];
  loading?: boolean;
}

export default function CameraStats({ data, loading }: CameraStatsProps) {
  const sorted = [...data].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <h2 className="font-bold text-gray-900 dark:text-white mb-4">역별 알림현황</h2>
      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700 mb-1">
        <span className="text-xs font-medium text-[#4B73F7]">역이름</span>
        <span className="text-xs font-medium text-[#4B73F7]">알림현황</span>
      </div>

      {loading ? (
        <div className="space-y-4 pt-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">데이터가 없습니다.</p>
      ) : (
        <div>
          {sorted.map((row) => (
            <div
              key={row.camera_id}
              className="flex items-center justify-between py-3 border-b border-gray-50 dark:border-gray-700 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  {row.station_name}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {row.location}
                </p>
              </div>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                {row.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
