/**
 * @file pages/StatsPage.tsx
 * @description 통계 리포트 페이지
 *
 * ## TODO
 * - [ ] ECharts 통계 시각화 구현
 * - [ ] GET /api/events/stats 데이터 연동
 */

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function StatsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          <p className="text-gray-400 text-sm">통계 리포트 준비 중...</p>
        </main>
      </div>
    </div>
  );
}
