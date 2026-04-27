/**
 * @file Sidebar.tsx
 * @description 대시보드 사이드바 컴포넌트
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

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "대시보드" },
  { to: "/stats", icon: BarChart2, label: "통계 리포트" },
  { to: "/events", icon: List, label: "전체 발생내역" },
  { to: "/settings", icon: Settings, label: "설정" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* 로고 */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-[#4B73F7] flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-gray-900 text-lg">GateGuard</span>
      </div>

      {/* 네비게이션 */}
      <nav className="flex flex-col gap-1.5 px-4 py-5 flex-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors
          ${
            isActive
              ? "bg-[#4B73F7] text-white"
              : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
          }`
            }
          >
            <Icon className="w-5 h-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
