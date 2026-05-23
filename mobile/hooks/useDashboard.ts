// 대시보드 데이터 훅 — 3개 API를 병렬로 호출하고 카메라 정보를 이벤트에 조인
// WebSocket NEW_EVENT 수신 시 낙관적 업데이트를 위한 handleNewEvent도 제공
import { useState, useEffect, useCallback, useRef } from 'react';
import { getEvents, getEventStats } from '@/services/eventService';
import { getCameras } from '@/services/cameraService';
import type { EventResponse, EventStats, CameraResponse } from '@/types';

export function useDashboard() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats]   = useState<EventStats | null>(null);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats]   = useState(true);

  // WebSocket 핸들러에서도 최신 카메라 맵을 참조하기 위해 ref 사용
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());

  const refresh = useCallback(async () => {
    setLoadingEvents(true);
    setLoadingStats(true);

    const [camResult, evResult, statsResult] =
      await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 10 }),
        getEventStats(),
      ]);

    // 카메라 맵 먼저 구성
    if (camResult.status === 'fulfilled') {
      cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
    }

    // 이벤트에 카메라 정보 조인
    if (evResult.status === 'fulfilled') {
      setEvents(
        evResult.value.map((e) => ({
          ...e,
          camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
        })),
      );
    }
    setLoadingEvents(false);

    if (statsResult.status === 'fulfilled') setStats(statsResult.value);
    setLoadingStats(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /** WebSocket NEW_EVENT 수신 시 낙관적 업데이트 */
  const handleNewEvent = useCallback((newEvent: EventResponse) => {
    const enriched: EventResponse = {
      ...newEvent,
      camera: cameraMapRef.current.get(newEvent.camera_id) ?? newEvent.camera,
    };
    setEvents((prev) => [enriched, ...prev].slice(0, 10));
    setStats((prev) =>
      prev ? { ...prev, today_total: prev.today_total + 1, pending: prev.pending + 1 } : prev,
    );
  }, []);

  return {
    events, stats,
    loadingEvents, loadingStats,
    refresh, handleNewEvent,
  };
}
