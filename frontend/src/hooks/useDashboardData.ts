import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from "@/hooks/useAppContext";
import { getEvents, getEventStats, getEventStatsByCamera } from "@/api/events";
import { getCameras } from "@/api/cameras";
import type {
  EventResponse,
  EventStats,
  CameraEventStats,
  CameraResponse,
} from "@/types";

export function useDashboardData() {
  const { setUnconfirmedCount, subscribeWsEvent } = useAppContext();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  const [falseAlarmEvents, setFalseAlarmEvents] = useState<EventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [loadingFalseAlarm, setLoadingFalseAlarm] = useState(true);
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());

  const joinCamera = useCallback((e: EventResponse): EventResponse => ({
    ...e,
    camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
  }), []);

  const doFetch = useCallback(async () => {
    const [camResult, evResult, statsResult, camStatsResult, falseAlarmResult] =
      await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 10 }),
        getEventStats(),
        getEventStatsByCamera(),
        getEvents({ status: "false_alarm", limit: 5 }),
      ]);

    if (camResult.status === "fulfilled") {
      cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
    }
    if (evResult.status === "fulfilled") {
      setEvents(evResult.value.map(joinCamera));
    }
    setLoadingEvents(false);

    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    setLoadingStats(false);

    if (camStatsResult.status === "fulfilled") {
      setCameraStats(
        camStatsResult.value.map((cs) => {
          const cam = cameraMapRef.current.get(cs.camera_id);
          return {
            ...cs,
            station_name: cam?.station_name ?? cs.station_name ?? "",
            location: cam?.location ?? cs.location ?? "",
          };
        }),
      );
    }
    setLoadingCamera(false);

    if (falseAlarmResult.status === "fulfilled") {
      setFalseAlarmEvents(falseAlarmResult.value.map(joinCamera));
    }
    setLoadingFalseAlarm(false);
  }, [joinCamera]);

  const refresh = useCallback(async () => {
    setLoadingEvents(true);
    setLoadingStats(true);
    setLoadingCamera(true);
    setLoadingFalseAlarm(true);
    await doFetch();
  }, [doFetch]);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    return subscribeWsEvent((newEvent) => {
      const enriched = joinCamera(newEvent);
      setEvents((prev) => [enriched, ...prev].slice(0, 10));
      setStats((prev) =>
        prev
          ? { ...prev, today_total: prev.today_total + 1, pending: prev.pending + 1 }
          : prev,
      );
      setCameraStats((prev) =>
        prev.map((c) =>
          c.camera_id === newEvent.camera_id ? { ...c, count: c.count + 1 } : c,
        ),
      );
    });
  }, [subscribeWsEvent, joinCamera]);

  const unconfirmedCount = stats?.pending ?? events.filter((e) => e.status === "pending").length;

  useEffect(() => {
    setUnconfirmedCount(unconfirmedCount);
  }, [unconfirmedCount, setUnconfirmedCount]);

  return {
    events,
    stats,
    cameraStats,
    falseAlarmEvents,
    loadingEvents,
    loadingStats,
    loadingCamera,
    loadingFalseAlarm,
    unconfirmedCount,
    refresh,
  };
}
