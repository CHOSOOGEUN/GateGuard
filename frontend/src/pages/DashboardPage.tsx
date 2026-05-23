import { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCards from "@/components/dashboard/StatCards";
import AlertList from "@/components/dashboard/AlertList";
import CameraStats from "@/components/dashboard/CameraStats";
import FalseAlarmList from "@/components/dashboard/FalseAlarmList";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import FalseAlarmModal from "@/components/dashboard/FalseAlarmModal";
import { useDashboardData } from "@/hooks/useDashboardData";
import type { EventResponse } from "@/types";

export default function DashboardPage() {
  const {
    events, stats, cameraStats, falseAlarmEvents,
    loadingEvents, loadingStats, loadingCamera, loadingFalseAlarm,
    unconfirmedCount, refresh,
  } = useDashboardData();
  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [falseAlarmEvent, setFalseAlarmEvent] = useState<EventResponse | null>(null);

  const handleOpenFalseAlarm = (event: EventResponse) => {
    setSelectedEvent(null);
    setFalseAlarmEvent(event);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          <StatCards stats={stats} loading={loadingStats} />
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            <AlertList
              events={events}
              loading={loadingEvents}
              unconfirmedCount={unconfirmedCount}
              onDetail={setSelectedEvent}
              onFalseAlarm={handleOpenFalseAlarm}
            />
            <div className="w-full lg:w-[340px] shrink-0 space-y-4">
              <CameraStats data={cameraStats} loading={loadingCamera} />
              <FalseAlarmList events={falseAlarmEvents} loading={loadingFalseAlarm} />
            </div>
          </div>
        </main>
      </div>

      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onConfirmed={refresh}
        />
      )}
      {falseAlarmEvent && (
        <FalseAlarmModal
          event={falseAlarmEvent}
          onClose={() => setFalseAlarmEvent(null)}
          onSubmitted={() => refresh()}
        />
      )}
    </div>
  );
}
