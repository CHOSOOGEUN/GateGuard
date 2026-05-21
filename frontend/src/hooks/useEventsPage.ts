import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getEvents } from "@/api/events";
import { getCameras } from "@/api/cameras";
import { useWebSocket } from "./useWebSocket";
import type { EventResponse, CameraResponse } from "@/types";
import { DEFAULT_FILTERS, type EventFilters } from "@/components/events/eventFiltersConfig";

function periodToDates(period: EventFilters["period"]): { date_from?: string; date_to?: string } {
  if (period === "all") return {};
  const now = new Date();
  if (period === "today") {
    const from = new Date(now);
    from.setHours(0, 0, 0, 0);
    const to = new Date(now);
    to.setHours(23, 59, 59, 999);
    return { date_from: from.toISOString(), date_to: to.toISOString() };
  }
  const days = period === "week" ? 7 : 30;
  const from = new Date(now.getTime() - days * 86400_000);
  return { date_from: from.toISOString() };
}

export function useEventsPage(setWsConnected: (v: boolean) => void) {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [rawEvents, setRawEvents] = useState<EventResponse[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());
  const [cameras, setCameras] = useState<CameraResponse[]>([]);

  // 카메라 목록 초기 로드 — 이벤트에 camera 정보 조인용
  useEffect(() => {
    getCameras()
      .then((cams) => {
        cameraMapRef.current = new Map(cams.map((c) => [c.id, c]));
        setCameras(cams);
        // 이미 fetch된 이벤트에 카메라 정보 후주입
        setRawEvents((prev) =>
          prev.map((e) => ({
            ...e,
            camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const doFetch = useCallback(async (f: EventFilters, p: number, ps: number) => {
    setLoading(true);
    const { date_from, date_to } = periodToDates(f.period);
    const params: Parameters<typeof getEvents>[0] = {
      limit: ps + 1, // 다음 페이지 존재 여부 판단용 +1
      offset: (p - 1) * ps,
      ...(f.status ? { status: f.status } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.cameraId ? { camera_id: Number(f.cameraId) } : {}),
      ...(date_from ? { date_from } : {}),
      ...(date_to ? { date_to } : {}),
      ...(f.search ? { search: f.search } : {}),
    };
    try {
      const result = await getEvents(params);
      setHasNextPage(result.length > ps);
      setRawEvents(
        result.slice(0, ps).map((e) => ({
          ...e,
          camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    doFetch(filters, page, pageSize);
  }, [filters, page, pageSize, doFetch]);

  const handleFiltersChange = useCallback((newFilters: EventFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSetPageSize = useCallback((ps: number) => {
    setPageSize(ps);
    setPage(1);
  }, []);

  // station 은 서버 파라미터가 없으므로 현재 페이지 내에서 클라이언트 필터
  // search 는 서버사이드로 처리됨
  const displayEvents = useMemo(() => {
    if (!filters.station) return rawEvents;
    return rawEvents.filter(
      (e) => e.camera?.station_name === filters.station
    );
  }, [rawEvents, filters.station]);

  const cameraOptions = useMemo(
    () =>
      [...cameras]
        .sort((a, b) => a.id - b.id)
        .map((c) => ({ id: c.id, label: `${c.station_name} ${c.location}` })),
    [cameras]
  );

  const stationOptions = useMemo(
    () =>
      ([...new Set(cameras.map((c) => c.station_name).filter(Boolean))] as string[]).sort(),
    [cameras]
  );

  const exportAll = useCallback(async (): Promise<EventResponse[]> => {
    const { date_from, date_to } = periodToDates(filters.period);
    const params: Parameters<typeof getEvents>[0] = {
      limit: 10000,
      offset: 0,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.cameraId ? { camera_id: Number(filters.cameraId) } : {}),
      ...(date_from ? { date_from } : {}),
      ...(date_to ? { date_to } : {}),
      ...(filters.search ? { search: filters.search } : {}),
    };
    const result = await getEvents(params);
    return result.map((e) => ({
      ...e,
      camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
    }));
  }, [filters]);

  const { connected } = useWebSocket((msg) => {
    if (msg.type === "NEW_EVENT") {
      doFetch(filters, page, pageSize);
    }
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected, setWsConnected]);

  return {
    filters,
    handleFiltersChange,
    displayEvents,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    hasNextPage,
    cameraOptions,
    stationOptions,
    refetch: () => doFetch(filters, page, pageSize),
    exportAll,
  };
}
