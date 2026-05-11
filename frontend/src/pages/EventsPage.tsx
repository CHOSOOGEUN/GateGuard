/**
 * @file pages/EventsPage.tsx
 * @description 전체 발생내역 페이지
 *
 * ## 기능
 * - GET /api/cameras/ + GET /api/events/?limit=500 병렬 호출 후 카메라 정보 조인
 * - 클라이언트사이드 필터: 텍스트 검색 / 기간 / 감지유형 / 카메라 / 상태 / 역
 * - 클라이언트사이드 페이지네이션: 기본 8건, 선택 가능 (8 / 16 / 32)
 * - EventDetailModal 재사용 (FalseAlarmModal은 EventDetailModal 내부에서 관리)
 * - WebSocket NEW_EVENT 수신 시 카메라 정보 조인 후 allEvents 앞에 실시간 삽입
 * - AppContext를 통해 wsConnected 상태 공유
 *
 * ## 주의사항
 * - 현재 클라이언트사이드 페이지네이션 (limit=500 fetch)
 *   → 데모 단계 유지. 실데이터 시 GET /api/events/?skip=N&limit=M 서버사이드로 전환 필요
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventsFilter, {
  DEFAULT_FILTERS,
  type EventFilters,
} from "@/components/events/EventsFilter";
import EventsTable from "@/components/events/EventsTable";
import EventsPagination from "@/components/events/EventsPagination";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import { getEvents } from "@/api/events";
import { getCameras } from "@/api/cameras";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAppContext } from "@/contexts/AppContext";
import type { EventResponse, CameraResponse } from "@/types";

export default function EventsPage() {
  const { setWsConnected } = useAppContext();
  const [allEvents, setAllEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());
  const [pageSize, setPageSize] = useState(8);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [camResult, evResult] = await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 500 }),
      ]);

      // 카메라 맵 구성 (WebSocket 핸들러에서도 참조하기 위해 ref에 저장)
      if (camResult.status === "fulfilled") {
        cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
      }

      // 이벤트에 카메라 정보 조인
      if (evResult.status === "fulfilled") {
        setAllEvents(
          evResult.value.map((e) => ({
            ...e,
            camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
          })),
        );
      }
    } catch {
      // 오류 시 빈 배열 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // WebSocket: 새 이벤트 실시간 수신
  const { connected } = useWebSocket((msg) => {
    if (msg.type === "NEW_EVENT") {
      const newEvent = msg.data as EventResponse;
      const enriched: EventResponse = {
        ...newEvent,
        camera: cameraMapRef.current.get(newEvent.camera_id) ?? newEvent.camera,
      };
      setAllEvents((prev) => [enriched, ...prev]);
    }
  });

  useEffect(() => {
    setWsConnected(connected);
  }, [connected, setWsConnected]);

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
    setPage(1); // 필터 변경 시 1페이지로 리셋
  };

  // ── 클라이언트사이드 필터링 ──────────────────────────
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      // 텍스트 검색: 이벤트 ID / 역이름 / 게이트 / 카메라 / 인상착의 / 설명
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const eventId = `ev-${String(e.id).padStart(4, "0")}`;
        const station = (e.camera?.station_name ?? "").toLowerCase();
        const gate = (e.camera?.location ?? "").toLowerCase();
        const camLabel = `cam-${String(e.camera_id).padStart(2, "0")}`;
        const tags = (e.appearance_tags ?? []).join(" ").toLowerCase();
        const desc = (e.description ?? "").toLowerCase();
        if (
          !eventId.includes(q) &&
          !station.includes(q) &&
          !gate.includes(q) &&
          !camLabel.includes(q) &&
          !tags.includes(q) &&
          !desc.includes(q)
        ) {
          return false;
        }
      }

      // 기간 필터
      if (filters.period !== "all") {
        const eventDate = new Date(e.timestamp);
        const now = new Date();
        if (filters.period === "today") {
          if (eventDate.toDateString() !== now.toDateString()) return false;
        } else if (filters.period === "week") {
          if (eventDate < new Date(now.getTime() - 7 * 86400_000)) return false;
        } else if (filters.period === "month") {
          if (eventDate < new Date(now.getTime() - 30 * 86400_000)) return false;
        }
      }

      if (filters.type) {
        if ((e.event_type ?? "") !== filters.type) return false;
      }

      // 카메라 필터
      if (filters.cameraId && String(e.camera_id) !== filters.cameraId)
        return false;

      // 상태 필터
      if (filters.status && e.status !== filters.status) return false;

      // 역 필터
      if (filters.station && e.camera?.station_name !== filters.station)
        return false;

      return true;
    });
  }, [allEvents, filters]);

  // ── 페이지네이션 ────────────────────────────────────
  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, page, pageSize]);

  // ── 드롭다운 옵션 (allEvents에서 추출) ──────────────
  const cameraOptions = useMemo(() => {
    const map = new Map<number, string>();
    allEvents.forEach((e) => {
      if (!map.has(e.camera_id)) {
        // 카메라 조인 후라면 역이름+게이트 표시, 아니면 CAM-XX
        const label = e.camera
          ? `${e.camera.station_name} ${e.camera.location}`
          : `CAM-${String(e.camera_id).padStart(2, "0")}`;
        map.set(e.camera_id, label);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, label]) => ({ id, label }));
  }, [allEvents]);

  const stationOptions = useMemo(() => {
    const stations = new Set<string>();
    allEvents.forEach((e) => {
      if (e.camera?.station_name) stations.add(e.camera.station_name);
    });
    return Array.from(stations).sort();
  }, [allEvents]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4">
          {/* 필터 바 */}
          <EventsFilter
            filters={filters}
            onChange={handleFiltersChange}
            cameraOptions={cameraOptions}
            stationOptions={stationOptions}
          />

          {/* 테이블 */}
          <EventsTable
            events={paginatedEvents}
            allFilteredEvents={filteredEvents}
            loading={loading}
            onDetail={setSelectedEvent}
          />

          {/* 페이지네이션 */}
          {!loading && (
            <EventsPagination
              total={filteredEvents.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </main>
      </div>

      {/* 이벤트 상세 모달 (재사용) */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onConfirmed={fetchAll}
        />
      )}


    </div>
  );
}
