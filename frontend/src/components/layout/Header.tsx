/**
 * @file Header.tsx
 * @description 대시보드 헤더 컴포넌트
 *
 * ## 기능
 * - 현재 경로 기반 페이지 타이틀 자동 표시
 *
 * ## 주의사항
 * - 실시간 모니터링 뱃지는 항상 "모니터링 중"으로 고정 표시 (useWebSocket connected 상태 미연동)
 * - 프로필 아바타는 하드코딩 ("관"), API 사용자 정보 연동 미구현
 *
 * ## TODO
 * - [ ] 실시간 모니터링 뱃지 → useWebSocket connected 상태 연동하여 on/off 전환
 * - [ ] 프로필 아바타 → API 사용자 정보로 교체
 */

import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocation } from "react-router-dom";

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/stats": "통계 리포트",
  "/events": "전체 발생내역",
  "/settings": "설정",
};

export default function Header() {
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "대시보드";

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8">
      {/* 페이지 타이틀 */}
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>

      {/* 우측 영역 */}
      <div className="flex items-center gap-4">
        {/* 실시간 모니터링 뱃지 */}
        <Badge className="bg-green-50 text-green-600 border border-green-200 font-medium gap-2 px-5 py-4 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
          실시간 모니터링 중
        </Badge>

        {/* 설정 아이콘 */}
        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
          <Settings className="w-5 h-5 text-gray-500" />
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
