/**
 * @file DashboardPage.tsx
 * @description 대시보드 메인 페이지
 *
 * ## 다음 작업
 * - [ ] StatCard 컴포넌트 (오늘 발생 / 확인 대기 / 처리 완료 / 오탐 신고)
 * - [ ] AlertList 컴포넌트 (최신 알림 목록)
 * - [ ] RegionStatus 컴포넌트 (구간별 알림현황)
 * - [ ] WebSocket 실시간 알림 연동
 * - [ ] ECharts 통계 시각화
 */

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          {/* 여기에 대시보드 콘텐츠 들어올 예정 */}
          <p className="text-gray-400 text-sm">대시보드 콘텐츠 준비 중...</p>
        </main>
      </div>
    </div>
  );
}
