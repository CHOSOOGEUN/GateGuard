/**
 * @file pages/EventsPage.tsx
 * @description 전체 발생내역 페이지
 *
 * ## 기능
 * - GET /api/cameras/ + GET /api/events/?limit=500 병렬 호출 후 카메라 정보 조인
 * - 클라이언트사이드 필터: 텍스트 검색(역/게이트/인상착의/설명) / 기간 / 감지유형 / 카메라 / 상태 / 역
 * - 클라이언트사이드 페이지네이션: 기본 8건, 선택 가능 (8 / 16 / 32)
 * - EventDetailModal / FalseAlarmModal 재사용 (DashboardPage와 동일 컴포넌트)
 * - EventDetailModal에는 allEvents 전달 (필터된 배열 아님) — 모달 내 이전/다음 탐색을 위해
 *
 * ## 주의사항
 * - 현재 클라이언트사이드 페이지네이션 (limit=500 fetch)
 *   → 이벤트 수 대규모 시 GET /api/events/?skip=N&limit=M 서버사이드로 전환 필요
 *
 * ## TODO
 * - [ ] WebSocket NEW_EVENT 수신 시 allEvents 앞에 삽입 (현재 초기 로드만)
 * - [ ] 서버사이드 페이지네이션 전환 (백엔드 skip/limit 파라미터 지원 확인 후)
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventsFilter, {
  DEFAULT_FILTERS,
  type EventFilters,
} from "@/components/events/EventsFilter";
import EventsTable from "@/components/events/EventsTable";
import EventsPagination from "@/components/events/EventsPagination";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import FalseAlarmModal from "@/components/dashboard/FalseAlarmModal";
import { getEvents } from "@/api/events";
import { getCameras } from "@/api/cameras";
import type { EventResponse } from "@/types";

export default function EventsPage() {
  const [allEvents, setAllEvents] = useState<EventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [falseAlarmEvent, setFalseAlarmEvent] = useState<EventResponse | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [camResult, evResult] = await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 500 }),
      ]);

      // 카메라 맵 구성
      const cameraMap = new Map(
        camResult.status === "fulfilled"
          ? camResult.value.map((c) => [c.id, c])
          : [],
      );

      // 이벤트에 카메라 정보 조인
      if (evResult.status === "fulfilled") {
        setAllEvents(
          evResult.value.map((e) => ({
            ...e,
            camera: cameraMap.get(e.camera_id) ?? e.camera,
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

  const handleFiltersChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
    setPage(1); // 필터 변경 시 1페이지로 리셋
  };

  // ── 클라이언트사이드 필터링 ──────────────────────────
  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
      // 텍스트 검색: 역이름 / 게이트 / 인상착의
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const station = (e.camera?.station_name ?? "").toLowerCase();
        const gate = (e.camera?.location ?? "").toLowerCase();
        const tags = (e.appearance_tags ?? []).join(" ").toLowerCase();
        const desc = (e.description ?? "").toLowerCase();
        if (
          !station.includes(q) &&
          !gate.includes(q) &&
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

      // 감지유형 필터 (event_type 우선, description fallback)
      if (filters.type) {
        const eventType = e.event_type ?? e.description ?? "";
        if (!eventType.includes(filters.type)) return false;
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

  // ── 모달 핸들러 ────────────────────────────────────
  const handleOpenFalseAlarm = (event: EventResponse) => {
    setSelectedEvent(null);
    setFalseAlarmEvent(event);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-6 space-y-4">
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
            onFalseAlarm={handleOpenFalseAlarm}
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
          events={allEvents}
          initialEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onFalseAlarm={handleOpenFalseAlarm}
          onConfirmed={fetchAll}
        />
      )}

      {/* 오탐신고 모달 (재사용) */}
      {falseAlarmEvent && (
        <FalseAlarmModal
          event={falseAlarmEvent}
          onClose={() => setFalseAlarmEvent(null)}
          onSubmitted={fetchAll}
        />
      )}
    </div>
  );
}
