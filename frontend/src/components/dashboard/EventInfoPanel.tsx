import { X, Clock, MapPin, Zap } from "lucide-react";
import type { EventResponse } from "@/types";
import { labelEventType } from "@/constants/eventTypes";

export interface CompletedInfo {
  type: "confirmed" | "false_alarm";
  at: string;
  reason?: string;
}

interface EventInfoPanelProps {
  event: EventResponse;
  badge: { label: string; cls: string };
  locationText: string;
  completedInfo: CompletedInfo | null;
  isActive: boolean;
  dispatched: boolean;
  confirming: boolean;
  onClose: () => void;
  onDispatch: () => void;
  onConfirm: () => void;
  onFalseAlarm: () => void;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatHMS(timestamp: string): string {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

export default function EventInfoPanel({
  event,
  badge,
  locationText,
  completedInfo,
  isActive,
  dispatched,
  confirming,
  onClose,
  onDispatch,
  onConfirm,
  onFalseAlarm,
}: EventInfoPanelProps) {
  return (
    <div className="w-52 shrink-0 flex flex-col border-l border-gray-100 dark:border-gray-700">
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
              <p className="font-medium">{labelEventType(event.event_type!)}</p>
            </div>
          </div>
        )}

        {event.confidence !== null && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            AI 신뢰도: {Math.round((event.confidence ?? 0) * 100)}%
          </p>
        )}
      </div>

      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        {completedInfo ? (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            {completedInfo.type === "confirmed" ? (
              <p>{formatDateTime(completedInfo.at)}에 처리완료 되었습니다.</p>
            ) : (
              <>
                <p>{formatDateTime(completedInfo.at)}에 오탐신고 되었습니다.</p>
                {completedInfo.reason && (
                  <p className="mt-1">사유: {completedInfo.reason}</p>
                )}
              </>
            )}
          </div>
        ) : isActive ? (
          <div className="space-y-2">
            <button
              onClick={onDispatch}
              disabled={dispatched}
              className="w-full py-2.5 rounded-xl border border-yellow-400 bg-yellow-50 text-yellow-600 font-bold text-sm hover:bg-yellow-100 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {dispatched ? "파견 완료" : "역무원 파견"}
            </button>
            <button
              onClick={onConfirm}
              disabled={confirming}
              className="w-full py-2.5 rounded-xl border border-green-500 bg-green-50 text-green-600 font-bold text-sm hover:bg-green-100 transition disabled:opacity-60"
            >
              {confirming ? "처리 중..." : "처리완료"}
            </button>
            <button
              onClick={onFalseAlarm}
              className="w-full py-2.5 rounded-xl border border-red-400 bg-red-50 text-red-500 font-bold text-sm hover:bg-red-100 transition"
            >
              오탐신고
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
