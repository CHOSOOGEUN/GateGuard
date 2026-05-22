import { useState } from "react";
import { Download } from "lucide-react";
import type { EventResponse } from "@/types";
import { labelEventType } from "@/constants/eventTypes";

interface EventsTableProps {
  events: EventResponse[];
  loading?: boolean;
  onDetail: (event: EventResponse) => void;
  onExport: () => Promise<EventResponse[]>;
}

// ── 유틸 ──────────────────────────────────────────────

function formatTime(ts: string): string {
  const d = new Date(ts);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function getSeverity(event: EventResponse): { label: string; cls: string } {
  const conf = event.confidence ?? 0;
  if (conf >= 0.7) return { label: "고위험", cls: "bg-red-100 text-red-500" };
  if (conf >= 0.4)
    return { label: "중간", cls: "bg-yellow-100 text-yellow-600" };
  return { label: "낮음", cls: "bg-green-100 text-green-600" };
}

function getStatusStyle(status: EventResponse["status"]): {
  label: string;
  cls: string;
} {
  if (status === "confirmed")
    return { label: "처리완료", cls: "text-gray-400" };
  if (status === "false_alarm") return { label: "오탐", cls: "text-gray-400" };
  return { label: "미확인", cls: "text-[#4B73F7] font-semibold" };
}

function exportToCSV(events: EventResponse[]) {
  const headers = [
    "#",
    "발생시각",
    "역/게이트",
    "감지유형",
    "심각도",
    "인상착의",
    "카메라",
    "상태",
    "담당자",
  ];

  const rows = events.map((e) => [
    `EV-${String(e.id).padStart(4, "0")}`,
    formatTime(e.timestamp),
    [e.camera?.station_name, e.camera?.location].filter(Boolean).join(" "),
    e.event_type ? labelEventType(e.event_type) : "",
    getSeverity(e).label,
    (e.appearance_tags ?? []).join(" "),
    `CAM-${String(e.camera_id).padStart(2, "0")}`,
    getStatusStyle(e.status).label,
    e.handled_by ?? "—",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gateguard_events_${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── 컴포넌트 ──────────────────────────────────────────

const COLUMNS: { label: string; cls?: string }[] = [
  { label: "#", cls: "w-28" },
  { label: "발생시각", cls: "w-32" },
  { label: "역/게이트", cls: "w-40" },
  { label: "감지유형", cls: "hidden sm:table-cell w-32" },
  { label: "심각도", cls: "w-24" },
  { label: "인상착의", cls: "hidden lg:table-cell w-36" },
  { label: "카메라", cls: "hidden sm:table-cell w-28" },
  { label: "상태", cls: "w-24" },
  { label: "담당자", cls: "hidden md:table-cell w-24" },
  { label: "대응", cls: "w-28" },
];

export default function EventsTable({
  events,
  loading,
  onDetail,
  onExport,
}: EventsTableProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const all = await onExport();
      exportToCSV(all);
    } finally {
      setExporting(false);
    }
  };
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 dark:bg-gray-700 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              {COLUMNS.map(({ label, cls }) => (
                <th
                  key={label}
                  className={`px-4 py-4 text-left text-xs font-semibold text-[#4B73F7] whitespace-nowrap bg-white dark:bg-gray-800 ${cls ?? ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-16 text-center text-sm text-gray-400"
                >
                  이벤트가 없습니다.
                </td>
              </tr>
            ) : (
              events.map((event) => {
                const severity = getSeverity(event);
                const statusStyle = getStatusStyle(event.status);
                const isActive = event.status === "pending";
                const station =
                  event.camera?.station_name ??
                  `CAM-${String(event.camera_id).padStart(2, "0")}`;
                const gate = event.camera?.location ?? "";
                const camLabel = `CAM-${String(event.camera_id).padStart(2, "0")}`;
                const detectionType = event.event_type
                  ? labelEventType(event.event_type)
                  : "—";
                const appearance =
                  event.appearance_tags && event.appearance_tags.length > 0
                    ? event.appearance_tags.join(" ")
                    : "—";

                return (
                  <tr
                    key={event.id}
                    className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {/* # */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? "bg-red-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          EV-{String(event.id).padStart(4, "0")}
                        </span>
                      </div>
                    </td>

                    {/* 발생시각 */}
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">
                      {formatTime(event.timestamp)}
                    </td>

                    {/* 역/게이트 */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-800 dark:text-gray-200">
                        {station}
                      </div>
                      {gate && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {gate}
                        </div>
                      )}
                    </td>

                    {/* 감지유형 */}
                    <td className="hidden sm:table-cell px-4 py-4 text-gray-600 dark:text-gray-400">
                      {detectionType}
                    </td>

                    {/* 심각도 */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${severity.cls}`}
                      >
                        {severity.label}
                      </span>
                    </td>

                    {/* 인상착의 */}
                    <td className="hidden lg:table-cell px-4 py-4 text-gray-600 dark:text-gray-400 max-w-[180px]">
                      <span className="line-clamp-2">{appearance}</span>
                    </td>

                    {/* 카메라 */}
                    <td className="hidden sm:table-cell px-4 py-4 text-gray-600 dark:text-gray-400">
                      {camLabel}
                    </td>

                    {/* 상태 */}
                    <td
                      className={`px-4 py-4 text-sm ${statusStyle.cls}`}
                    >
                      {statusStyle.label}
                    </td>

                    {/* 담당자 */}
                    <td className="hidden md:table-cell px-4 py-4 text-gray-500 dark:text-gray-400">
                      {event.handled_by ?? "—"}
                    </td>

                    {/* 대응 */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDetail(event)}
                          className={`font-medium ${isActive ? "text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white" : "text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"}`}
                        >
                          {isActive ? "상세" : "기록"}
                        </button>
                        {event.status === "false_alarm" && (
                          <span className="text-red-400 text-sm font-medium">
                            오탐
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* CSV 내보내기 */}
      <div className="flex justify-end px-5 py-3 border-t border-gray-50 dark:border-gray-700">
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition disabled:opacity-40"
        >
          {exporting ? "내보내는 중..." : "CSV 내보내기"}
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
