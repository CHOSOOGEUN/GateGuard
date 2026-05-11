import { useState } from "react";
import { X, Clock, MapPin, Zap, Video } from "lucide-react";
import type { EventResponse } from "@/types";
import { updateEventStatus } from "@/api/events";

interface EventDetailModalProps {
  event: EventResponse;
  onClose: () => void;
  onFalseAlarm: (event: EventResponse) => void;
  onConfirmed: () => void;
}

function formatHMS(timestamp: string): string {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function getSeverityBadge(event: EventResponse): { label: string; cls: string } {
  if (event.status === "confirmed") return { label: "처리완료", cls: "bg-green-100 text-green-600" };
  if (event.status === "false_alarm") return { label: "오탐", cls: "bg-gray-100 text-gray-500" };
  if ((event.confidence ?? 0) >= 0.7) return { label: "고위험", cls: "bg-red-100 text-red-500" };
  return { label: "중간", cls: "bg-yellow-100 text-yellow-600" };
}

export default function EventDetailModal({
  event,
  onClose,
  onFalseAlarm,
  onConfirmed,
}: EventDetailModalProps) {
  const [confirming, setConfirming] = useState(false);

  const isActive = event.status === "pending";
  const badge = getSeverityBadge(event);
  const station = event.camera?.station_name ?? "";
  const gate = event.camera?.location ?? "";
  const locationText =
    station && gate ? `${station} ${gate}` : station || `카메라 #${event.camera_id}`;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await updateEventStatus(event.id, "confirmed");
      onConfirmed();
      onClose();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDispatch = () => {
    alert("역무원 파견 기능은 준비 중입니다.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-3xl mx-4"
        style={{ maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 영상 영역 */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center min-w-0">
          {event.clip_url ? (
            <video
              src={event.clip_url}
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Video className="w-10 h-10" />
              <span className="text-sm">영상 클립 없음</span>
            </div>
          )}
        </div>

        {/* 정보 패널 */}
        <div className="w-52 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-700">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate">
                Event #{event.id}
              </span>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition shrink-0 ml-1"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* 상세 정보 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">기록시각</p>
                <p className="font-medium">{formatHMS(event.timestamp)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-gray-400 mb-0.5">위치</p>
                <p className="font-medium">{locationText}</p>
              </div>
            </div>

            {event.event_type && (
              <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Zap className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">감지유형</p>
                  <p className="font-medium">{event.event_type}</p>
                </div>
              </div>
            )}

            {event.confidence !== null && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                AI 신뢰도: {Math.round((event.confidence ?? 0) * 100)}%
              </p>
            )}
          </div>

          {/* 액션 버튼 */}
          {isActive && (
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <button
                onClick={handleDispatch}
                className="w-full py-2.5 rounded-xl border border-yellow-400 bg-yellow-50 text-yellow-600 font-bold text-sm hover:bg-yellow-100 transition"
              >
                역무원 파견
              </button>
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full py-2.5 rounded-xl border border-green-500 bg-green-50 text-green-600 font-bold text-sm hover:bg-green-100 transition disabled:opacity-60"
              >
                {confirming ? "처리 중..." : "처리완료"}
              </button>
              <button
                onClick={() => onFalseAlarm(event)}
                className="w-full py-2.5 rounded-xl border border-red-400 bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition"
              >
                오탐신고
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
