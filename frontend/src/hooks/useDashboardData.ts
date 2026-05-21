import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { getEvents, getEventStats, getEventStatsByCamera } from "@/api/events";
import { getNotifications } from "@/api/notifications";
import { getCameras } from "@/api/cameras";
import { useWebSocket } from "./useWebSocket";
import type {
  EventResponse,
  EventStats,
  CameraEventStats,
  CameraResponse,
  NotificationResponse,
} from "@/types";

export function useDashboardData() {
  const { setWsConnected, setUnconfirmedCount } = useAppContext();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(true);
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());

  const doFetch = useCallback(async () => {
    const [camResult, evResult, statsResult, camStatsResult, notifResult] =
      await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 10 }),
        getEventStats(),
        getEventStatsByCamera(),
        getNotifications({ unread_only: false }),
      ]);

    if (camResult.status === "fulfilled") {
      cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
    }
    if (evResult.status === "fulfilled") {
      setEvents(
        evResult.value.map((e) => ({
          ...e,
          camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
        })),
      );
    }
    setLoadingEvents(false);

    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    setLoadingStats(false);

    if (camStatsResult.status === "fulfilled") setCameraStats(camStatsResult.value);
    setLoadingCamera(false);

    if (notifResult.status === "fulfilled") setNotifications(notifResult.value);
    setLoadingNotif(false);
  }, []);

  const refresh = useCallback(async () => {
    setLoadingEvents(true);
    setLoadingStats(true);
    setLoadingCamera(true);
    setLoadingNotif(true);
    await doFetch();
  }, [doFetch]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const { connected } = useWebSocket((msg) => {
    if (msg.type === "NEW_EVENT") {
      const newEvent = msg.data as EventResponse;
      const enriched: EventResponse = {
        ...newEvent,
        camera: cameraMapRef.current.get(newEvent.camera_id) ?? newEvent.camera,
      };
      setEvents((prev) => [enriched, ...prev].slice(0, 10));
      setStats((prev) =>
        prev ? { ...prev, today_total: prev.today_total + 1, pending: prev.pending + 1 } : prev,
      );
      setCameraStats((prev) =>
        prev.map((c) =>
          c.camera_id === newEvent.camera_id ? { ...c, count: c.count + 1 } : c,
        ),
      );
    }
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected, setWsConnected]);

  const unconfirmedCount = events.filter((e) => e.status === "pending").length;

  useEffect(() => {
    setUnconfirmedCount(unconfirmedCount);
  }, [unconfirmedCount, setUnconfirmedCount]);

  return {
    events,
    stats,
    cameraStats,
    notifications,
    loadingEvents,
    loadingStats,
    loadingCamera,
    loadingNotif,
    unconfirmedCount,
    refresh,
  };
}
