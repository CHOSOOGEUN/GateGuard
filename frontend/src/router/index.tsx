import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import StatsPage from "../pages/StatsPage";
import EventsPage from "../pages/EventsPage";
import SettingsPage from "../pages/SettingsPage";
import type { ReactNode } from "react";

function PrivateRoute({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (!token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginPage />,
  },
  {
    path: "/dashboard",
    element: <PrivateRoute><DashboardPage /></PrivateRoute>,
  },
  {
    path: "/stats",
    element: <PrivateRoute><StatsPage /></PrivateRoute>,
  },
  {
    path: "/events",
    element: <PrivateRoute><EventsPage /></PrivateRoute>,
  },
  {
    path: "/settings",
    element: <PrivateRoute><SettingsPage /></PrivateRoute>,
  },
]);
