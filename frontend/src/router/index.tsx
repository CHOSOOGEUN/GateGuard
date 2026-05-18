import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import StatsPage from "../pages/StatsPage";
import EventsPage from "../pages/EventsPage";
import SettingsPage from "../pages/SettingsPage";
import PrivateRoute from "./PrivateRoute";

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
