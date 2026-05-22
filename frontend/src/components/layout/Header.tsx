/**
 * @file Header.tsx
 * @description 대시보드 헤더 컴포넌트
 *
 * ## 기능
 * - 현재 경로 기반 페이지 타이틀 자동 표시
 * - AppContext의 wsConnected 상태에 따라 실시간 모니터링 뱃지 on(초록)/off(회색) 전환
 * - 톱니바퀴 아이콘 클릭 시 /settings 이동
 * - 다크모드: OS/브라우저 prefers-color-scheme 자동 연동 (수동 토글 없음)
 *
 * ## 주의사항
 * - 프로필 아바타는 하드코딩 ("관"), API 사용자 정보 연동 미구현
 *
 * ## TODO
 * - [ ] 프로필 아바타 → API 사용자 정보로 교체
 */

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "@/contexts/AppContext";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/stats": "통계 리포트",
  "/events": "전체 발생내역",
  "/settings": "설정",
};

export default function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { wsConnected } = useAppContext();
  const title = pageTitles[pathname] ?? "대시보드";

  return (
    <header className="h-16 lg:h-20 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 lg:px-8">
      {/* 페이지 타이틀 */}
      <h1 className="text-base lg:text-xl font-bold text-gray-900 dark:text-white">{title}</h1>

      {/* 우측 영역 */}
      <div className="flex items-center gap-2 lg:gap-4">
        {/* 실시간 모니터링 뱃지 — 작은 화면은 dot만 표시 */}
        {wsConnected ? (
          <Badge className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700 font-medium gap-2 px-3 lg:px-5 py-4 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
            <span className="hidden lg:inline">실시간 모니터링 중</span>
          </Badge>
        ) : (
          <Badge className="bg-gray-50 dark:bg-gray-700 text-gray-400 border border-gray-200 dark:border-gray-600 font-medium gap-2 px-3 lg:px-5 py-4 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            <span className="hidden lg:inline">연결 끊김</span>
          </Badge>
        )}

        {/* 설정 아이콘 */}
        <button
          onClick={() => navigate("/settings")}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>

        {/* 프로필 아바타 */}
        <Avatar className="w-10 h-10">
          <AvatarFallback className="bg-[#4B73F7] text-white text-sm font-bold">
            관
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
