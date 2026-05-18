import { useState, useMemo } from "react";
import { DEFAULT_FILTERS, type EventFilters } from "@/components/events/eventFiltersConfig";
import type { EventResponse } from "@/types";

export function useEventsFilter(allEvents: EventResponse[]) {
  const [filters, setFilters] = useState<EventFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  function handleFiltersChange(newFilters: EventFilters) {
    setFilters(newFilters);
    setPage(1);
  }

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => {
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
        ) return false;
      }
      if (filters.period !== "all") {
        const eventDate = new Date(e.timestamp);
        const now = new Date();
        if (filters.period === "today" && eventDate.toDateString() !== now.toDateString()) return false;
        if (filters.period === "week" && eventDate < new Date(now.getTime() - 7 * 86400_000)) return false;
        if (filters.period === "month" && eventDate < new Date(now.getTime() - 30 * 86400_000)) return false;
      }
      if (filters.type && (e.event_type ?? "") !== filters.type) return false;
      if (filters.cameraId && String(e.camera_id) !== filters.cameraId) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.station && e.camera?.station_name !== filters.station) return false;
      return true;
    });
  }, [allEvents, filters]);

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, page, pageSize]);

  const cameraOptions = useMemo(() => {
    const map = new Map<number, string>();
    allEvents.forEach((e) => {
      if (!map.has(e.camera_id)) {
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

  return {
    filters,
    handleFiltersChange,
    filteredEvents,
    paginatedEvents,
    cameraOptions,
    stationOptions,
    page,
    setPage,
    pageSize,
    setPageSize,
  };
}
