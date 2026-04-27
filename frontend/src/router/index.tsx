/**
 * @file router/index.tsx
 * @description 클라이언트 라우터 설정
 *
 * ## 라우트 목록
 * - /            → LoginPage  (공개)
 * - /dashboard   → DashboardPage
 * - /stats       → StatsPage  (placeholder)
 * - /events      → EventsPage
 *
 * ## 주의사항
 * - Auth route guard 미구현 — 토큰 없이도 모든 라우트 접근 가능
 * - /settings 라우트 미등록 (Sidebar에 항목은 있음)
 */

import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import StatsPage from "../pages/StatsPage";
import EventsPage from "../pages/EventsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <DashboardPage />,
  },
  {
    path: "/stats",
    element: <StatsPage />,
  },
  {
    path: "/events",
    element: <EventsPage />,
  },
]);
