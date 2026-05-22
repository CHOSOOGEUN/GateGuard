import { AlertTriangle } from "lucide-react";
import type { EventResponse } from "@/types";
import { labelEventType } from "@/constants/eventTypes";

interface FalseAlarmListProps {
  events: EventResponse[];
  loading?: boolean;
}

function formatRelativeTime(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  const timeStr = `${d.getHours()}시 ${String(d.getMinutes()).padStart(2, "0")}분`;
  if (diffDays === 0) return `오늘 ${timeStr}`;
  if (diffDays === 1) return `어제 ${timeStr}`;
  return `${diffDays}일 전 ${timeStr}`;
}

function getLabel(e: EventResponse): string {
  const station = e.camera?.station_name;
  const gate = e.camera?.location;
  const location = station && gate ? `${station} ${gate}` : station ?? `카메라 #${e.camera_id}`;
  const type = labelEventType(e.event_type ?? "");
  return `${location} — ${type}`;
}

export default function FalseAlarmList({ events, loading }: FalseAlarmListProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="font-bold text-gray-900 dark:text-white">최근 오탐 신고</h2>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          최근 오탐 신고 내역이 없습니다.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((e) => (
            <div key={e.id} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-800 dark:text-gray-200 font-medium leading-tight">
                  {getLabel(e)}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {formatRelativeTime(e.handled_at ?? e.timestamp)}
                  {e.reason && ` · ${e.reason}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
