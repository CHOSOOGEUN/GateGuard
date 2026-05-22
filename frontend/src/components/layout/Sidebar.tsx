/**
 * @file Sidebar.tsx
 * @description 대시보드 사이드바 컴포넌트
 *
 * ## 기능
 * - AppContext의 unconfirmedCount > 0 이면 대시보드 메뉴 항목에 빨간 뱃지 표시 (최대 99+)
 *
 * ## TODO
 * - [ ] 로고 이미지 파일 생기면 Shield 아이콘 → <img src="/logo.png" /> 로 교체
 */

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  BarChart2,
  List,
  Settings,
  Shield,
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { to: "/stats", icon: BarChart2, label: "통계 리포트" },
  { to: "/events", icon: List, label: "전체 발생내역" },
  { to: "/settings", icon: Settings, label: "설정" },
];

export default function Sidebar() {
  const { unconfirmedCount } = useAppContext();

  return (
    <aside className="w-16 lg:w-64 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-100 dark:border-gray-700 flex flex-col shrink-0">
      {/* 로고 */}
      <div className="flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-6 py-6 border-b border-gray-100 dark:border-gray-700">
        <div className="w-10 h-10 rounded-xl bg-[#4B73F7] flex items-center justify-center shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="hidden lg:block font-bold text-gray-900 dark:text-white text-lg">GateGuard</span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-1.5 px-2 lg:px-4 py-5 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={label}
            className={({ isActive }) =>
              `flex items-center justify-center lg:justify-start gap-3 px-0 lg:px-4 py-3 rounded-xl text-base font-medium transition-colors
          ${
            isActive
              ? "bg-[#4B73F7] text-white"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
          }`
            }
          >
            <div className="relative shrink-0">
              <Icon className="w-5 h-5" />
              {to === "/dashboard" && unconfirmedCount > 0 && (
                <span className="lg:hidden absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unconfirmedCount > 9 ? "9+" : unconfirmedCount}
                </span>
              )}
            </div>
            <span className="hidden lg:block flex-1">{label}</span>
            {to === "/dashboard" && unconfirmedCount > 0 && (
              <span className="hidden lg:flex min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold items-center justify-center">
                {unconfirmedCount > 99 ? "99+" : unconfirmedCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
