import type { CameraEventStats } from "@/types";

interface Props {
  data: CameraEventStats[];
}

const BAR_COLORS = ["#ef4444", "#f59e0b", "#4B73F7", "#10b981", "#9ca3af"];

export default function CameraRankingTable({ data }: Props) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">데이터 없음</p>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-400 text-xs border-b border-gray-100">
          <th className="pb-2 text-left font-medium w-10">순위</th>
          <th className="pb-2 text-left font-medium">역 · 게이트</th>
          <th className="pb-2 text-right font-medium w-16">건수</th>
          <th className="pb-2 text-left font-medium pl-4">비율</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => {
          const pct = Math.round((row.count / maxCount) * 100);
          const color = BAR_COLORS[i] ?? "#9ca3af";
          return (
            <tr key={row.camera_id} className="border-b border-gray-50 last:border-0">
              <td className="py-3 text-gray-400">{i + 1}</td>
              <td className="py-3 text-gray-700">
                {row.station_name} {row.location}
              </td>
              <td className="py-3 text-right text-gray-600">{row.count}</td>
              <td className="py-3 pl-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-8">{pct}%</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
