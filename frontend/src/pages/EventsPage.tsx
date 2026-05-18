import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventsFilter from "@/components/events/EventsFilter";
import EventsTable from "@/components/events/EventsTable";
import EventsPagination from "@/components/events/EventsPagination";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import { useAppContext } from "@/contexts/AppContext";
import { useEventsData } from "@/hooks/useEventsData";
import { useEventsFilter } from "@/hooks/useEventsFilter";
import type { EventResponse } from "@/types";

export default function EventsPage() {
  const { setWsConnected } = useAppContext();
  const { allEvents, loading, fetchAll } = useEventsData(setWsConnected);
  const {
    filters, handleFiltersChange,
    filteredEvents, paginatedEvents,
    cameraOptions, stationOptions,
    page, setPage, pageSize, setPageSize,
  } = useEventsFilter(allEvents);
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
            events={paginatedEvents}
            allFilteredEvents={filteredEvents}
            loading={loading}
            onDetail={setSelectedEvent}
          />
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
