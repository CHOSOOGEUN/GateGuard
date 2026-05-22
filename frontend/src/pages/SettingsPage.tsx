/**
 * @file pages/SettingsPage.tsx
 * @description 설정 페이지
 *
 * ## TODO
 * - [ ] 설정 기능 구현 (사용자 관리, 알림 설정, 카메라 관리 등)
 */

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6">
          <p className="text-gray-400 text-sm">설정 준비 중...</p>
        </main>
      </div>
    </div>
  );
}
