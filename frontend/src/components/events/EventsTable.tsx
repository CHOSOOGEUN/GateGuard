/**
 * @file components/events/EventsTable.tsx
 * @description 전체 발생내역 테이블 컴포넌트
 *
 * ## 기능
 * - 10개 컬럼 테이블: #, 발생시각, 역/게이트, 감지유형, 심각도, 인상착의, 카메라, 상태, 담당자, 대응
 * - 심각도 3단계: confidence ≥ 0.7 → 고위험(빨강) / ≥ 0.4 → 중간(노랑) / < 0.4 → 낮음(초록)
 * - 상태별 대응 버튼: pending → 상세+오탐 / confirmed·false_alarm → 기록
 * - 액셀 내보내기: 필터링된 이벤트 전체를 UTF-8 BOM CSV로 다운로드 (엑셀 한글 정상 표시)
 * - loading 시 스켈레톤 / 빈 배열 시 안내 문구
 *
 * ## 주의사항
 * - 감지유형: event_type 필드 우선, 없으면 description fallback
 * - 담당자: assigned_to 필드 우선, 없으면 "—" 표시
 * - 액셀 내보내기는 현재 페이지가 아닌 필터링된 전체 데이터 기준
 *
 * ## TODO
 * - [ ] event_type, assigned_to 필드 백엔드 확정 후 수정
 * - [ ] .xlsx 포맷 필요 시 xlsx 라이브러리 설치 (npm install xlsx)
 *
 * ## 협의
 * - 감지유형 enum 값 목록 백엔드(조수근) 확정 필요
 */

import { Download } from "lucide-react";
import type { EventResponse } from "@/types";

interface EventsTableProps {
  /** 현재 페이지에 표시할 이벤트 (페이지네이션 적용 후) */
  events: EventResponse[];
  /** 액셀 내보내기 대상: 필터링된 전체 이벤트 */
  allFilteredEvents: EventResponse[];
  loading?: boolean;
  onDetail: (event: EventResponse) => void;
  onFalseAlarm: (event: EventResponse) => void;
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
  if (conf >= 0.4) return { label: "중간", cls: "bg-yellow-100 text-yellow-600" };
  return { label: "낮음", cls: "bg-green-100 text-green-600" };
}

function getStatusStyle(status: EventResponse["status"]): {
  label: string;
  cls: string;
} {
  if (status === "confirmed")
    return { label: "처리완료", cls: "text-gray-400" };
  if (status === "false_alarm")
    return { label: "오탐", cls: "text-pink-500" };
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
    e.event_type ?? e.description ?? "",
    getSeverity(e).label,
    (e.appearance_tags ?? []).join(" "),
    `CAM-${String(e.camera_id).padStart(2, "0")}`,
    getStatusStyle(e.status).label,
    e.assigned_to ?? "—",
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

const COLUMNS = [
  "#",
  "발생시각",
  "역/게이트",
  "감지유형",
  "심각도",
  "인상착의",
  "카메라",
  "상태",
  "담당자",
  "대응",
];

export default function EventsTable({
  events,
  allFilteredEvents,
  loading,
  onDetail,
  onFalseAlarm,
}: EventsTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-4 text-left text-xs font-semibold text-[#4B73F7] whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {events.length === 0 ? (
              <tr>
                <td
                  colSpan={COLUMNS.length}
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
                const detectionType = event.event_type ?? event.description ?? "—";
                const appearance =
                  event.appearance_tags && event.appearance_tags.length > 0
                    ? event.appearance_tags.join(" ")
                    : "—";

                return (
                  <tr
                    key={event.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    {/* # */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isActive ? "bg-red-500" : "bg-gray-300"
                          }`}
                        />
                        <span className="font-medium text-gray-700">
                          EV-{String(event.id).padStart(4, "0")}
                        </span>
                      </div>
                    </td>

                    {/* 발생시각 */}
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {formatTime(event.timestamp)}
                    </td>

                    {/* 역/게이트 */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-800">{station}</div>
                      {gate && (
                        <div className="text-xs text-gray-400">{gate}</div>
                      )}
                    </td>

                    {/* 감지유형 */}
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {detectionType}
                    </td>

                    {/* 심각도 */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-block text-xs px-2.5 py-1 rounded-full font-semibold ${severity.cls}`}
                      >
                        {severity.label}
                      </span>
                    </td>

                    {/* 인상착의 */}
                    <td className="px-4 py-4 text-gray-600 max-w-[180px]">
                      <span className="line-clamp-2">{appearance}</span>
                    </td>

                    {/* 카메라 */}
                    <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                      {camLabel}
                    </td>

                    {/* 상태 */}
                    <td className={`px-4 py-4 whitespace-nowrap text-sm ${statusStyle.cls}`}>
                      {statusStyle.label}
                    </td>

                    {/* 담당자 */}
                    <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                      {event.assigned_to ?? "—"}
                    </td>

                    {/* 대응 */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {isActive ? (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => onDetail(event)}
                            className="text-gray-700 hover:text-gray-900 font-medium"
                          >
                            상세
                          </button>
                          <button
                            onClick={() => onFalseAlarm(event)}
                            className="text-red-400 hover:text-red-600 font-medium"
                          >
                            오탐
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onDetail(event)}
                          className="text-gray-400 hover:text-gray-600 font-medium"
                        >
                          기록
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 액셀 내보내기 */}
      {allFilteredEvents.length > 0 && (
        <div className="flex justify-end px-5 py-3 border-t border-gray-50">
          <button
            onClick={() => exportToCSV(allFilteredEvents)}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition"
          >
            액셀 내보내기
            <Download className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
