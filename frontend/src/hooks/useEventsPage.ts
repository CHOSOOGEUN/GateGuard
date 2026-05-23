import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { getEvents, getEventsPaged } from "@/api/events";
import { getCameras } from "@/api/cameras";
import { useAppContext } from "./useAppContext";
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

export function useEventsPage() {
  const { subscribeWsEvent } = useAppContext();
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [rawEvents, setRawEvents] = useState<EventResponse[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [total, setTotal] = useState(0);
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
    const params: Parameters<typeof getEventsPaged>[0] = {
      limit: ps,
      offset: (p - 1) * ps,
      ...(f.status ? { status: f.status } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.cameraId ? { camera_id: Number(f.cameraId) } : {}),
      ...(f.station ? { station: f.station } : {}),  // PR #30 — 백엔드 서버사이드 필터
      ...(date_from ? { date_from } : {}),
      ...(date_to ? { date_to } : {}),
      ...(f.search ? { search: f.search } : {}),
    };
    try {
      const { items, total: t } = await getEventsPaged(params);
      setTotal(t);
      setHasNextPage(p * ps < t);
      setRawEvents(
        items.map((e) => ({
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

  // station 필터는 백엔드(PR #30)에서 처리되므로 클라 후필터 불필요
  const displayEvents = rawEvents;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

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
      ...(filters.station ? { station: filters.station } : {}),
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

  useEffect(() => {
    return subscribeWsEvent(() => {
      doFetch(filters, page, pageSize);
    });
  }, [subscribeWsEvent, doFetch, filters, page, pageSize]);

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
    total,
    totalPages,
    cameraOptions,
    stationOptions,
    refetch: () => doFetch(filters, page, pageSize),
    exportAll,
  };
}
