import { useState, useEffect, useCallback, useRef } from "react";
import { getEvents } from "@/api/events";
import { getCameras } from "@/api/cameras";
import { useWebSocket } from "./useWebSocket";
import type { EventResponse, CameraResponse } from "@/types";

export function useEventsData(setWsConnected: (v: boolean) => void) {
  const [allEvents, setAllEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [camResult, evResult] = await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 500 }),
      ]);
      if (camResult.status === "fulfilled") {
        cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
      }
      if (evResult.status === "fulfilled") {
        setAllEvents(
          evResult.value.map((e) => ({
            ...e,
            camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const { connected } = useWebSocket((msg) => {
    if (msg.type === "NEW_EVENT") {
      const newEvent = msg.data as EventResponse;
      setAllEvents((prev) => [
        { ...newEvent, camera: cameraMapRef.current.get(newEvent.camera_id) ?? newEvent.camera },
        ...prev,
      ]);
    }
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected, setWsConnected]);

  return { allEvents, loading, fetchAll };
}
