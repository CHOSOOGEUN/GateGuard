/**
 * @file components/dashboard/CameraStats.tsx
 * @description 구간별 알림현황 테이블 컴포넌트
 *
 * ## 기능
 * - CameraEventStats[] 를 테이블로 렌더링
 * - count ≥ 5 → 고위험(빨강) / ≥ 2 → 주의(노랑) / < 2 → 정상(회색)
 * - loading 시 스켈레톤 / 빈 배열 시 안내 문구 표시
 *
 * ## 주의사항
 * - GET /api/events/stats/by-camera 는 백엔드 M2 구현 예정, 전까지 빈 테이블 표시
 *
 * ## TODO
 * - [ ] 지도보기 버튼 기능 구현
 * - [ ] 행 클릭 시 해당 카메라 이벤트 필터링 이동
 *
 * ## 협의
 * - 색상 분기 임계값(5, 2) 기획 확정 후 수정 필요
 */

import { MapPin } from "lucide-react";
import type { CameraEventStats } from "@/types";

interface CameraStatsProps {
  data: CameraEventStats[];
  loading?: boolean;
}

function getDotColor(count: number): string {
  if (count >= 5) return "bg-red-500";
  if (count >= 2) return "bg-yellow-400";
  return "bg-gray-300";
}

function getCountColor(count: number): string {
  if (count >= 5) return "text-red-500";
  if (count >= 2) return "text-yellow-500";
  return "text-gray-500";
}

export default function CameraStats({ data, loading }: CameraStatsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white">구간별 알림현황</h2>
        <button className="flex items-center gap-1 text-xs text-[#4B73F7] hover:underline">
          <MapPin className="w-3 h-3" />
          지도보기
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          데이터가 없습니다.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-700">
              <th className="text-left pb-2 font-medium">역이름</th>
              <th className="text-right pb-2 font-medium">알림현황</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.camera_id}
                className="border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <td className="py-2.5 text-gray-700 dark:text-gray-300">
                  <div className="font-medium">{row.station_name}</div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">{row.location}</div>
                </td>
                <td className="py-2.5 text-right">
                  <span
                    className={`inline-flex items-center gap-1 font-bold ${getCountColor(row.count)}`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${getDotColor(row.count)}`}
                    />
                    {row.count}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
