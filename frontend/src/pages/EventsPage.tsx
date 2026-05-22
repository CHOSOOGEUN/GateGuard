import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventsFilter from "@/components/events/EventsFilter";
import EventsTable from "@/components/events/EventsTable";
import EventsPagination from "@/components/events/EventsPagination";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import { useEventsPage } from "@/hooks/useEventsPage";
import type { EventResponse } from "@/types";

export default function EventsPage() {
  const {
    filters,
    handleFiltersChange,
    displayEvents,
    loading,
    page,
    setPage,
    pageSize,
    setPageSize,
    hasNextPage,
    cameraOptions,
    stationOptions,
    refetch,
    exportAll,
  } = useEventsPage();
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4">
          <EventsFilter
            filters={filters}
            onChange={handleFiltersChange}
            cameraOptions={cameraOptions}
            stationOptions={stationOptions}
          />
          <EventsTable
            events={displayEvents}
            loading={loading}
            onDetail={setSelectedEvent}
            onExport={exportAll}
          />
          {!loading && (
            <EventsPagination
              page={page}
              pageSize={pageSize}
              hasNextPage={hasNextPage}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </main>
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onConfirmed={refetch}
        />
      )}
    </div>
  );
}
