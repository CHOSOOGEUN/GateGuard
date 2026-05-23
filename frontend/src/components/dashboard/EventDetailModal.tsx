import { useState } from "react";
import type { EventResponse } from "@/types";
import { updateEventStatus, getEventById } from "@/api/events";
import FalseAlarmModal from "./FalseAlarmModal";
import EventVideoPanel from "./EventVideoPanel";
import EventInfoPanel, { type CompletedInfo } from "./EventInfoPanel";

interface EventDetailModalProps {
  event: EventResponse;
  onClose: () => void;
  onConfirmed: () => void;
}

function getSeverityBadge(event: EventResponse): {
  label: string;
  cls: string;
} {
  if (event.status === "confirmed")
    return { label: "처리완료", cls: "bg-green-100 text-green-600" };
  if (event.status === "false_alarm")
    return { label: "오탐", cls: "bg-gray-100 text-gray-500" };
  const conf = event.confidence ?? 0;
  if (conf >= 0.7) return { label: "고위험", cls: "bg-red-100 text-red-500" };
  if (conf >= 0.4)
    return { label: "중간", cls: "bg-yellow-100 text-yellow-600" };
  return { label: "낮음", cls: "bg-green-100 text-green-600" };
}

export default function EventDetailModal({
  event,
  onClose,
  onConfirmed,
}: EventDetailModalProps) {
  const [dispatched, setDispatched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showFalseAlarm, setShowFalseAlarm] = useState(false);
  const [completedInfo, setCompletedInfo] = useState<CompletedInfo | null>(
    () => {
      if (event.status === "confirmed")
        return {
          type: "confirmed",
          at: event.handled_at ?? new Date().toISOString(),
        };
      if (event.status === "false_alarm")
        return {
          type: "false_alarm",
          at: event.handled_at ?? new Date().toISOString(),
          reason: event.reason ?? undefined,
        };
      return null;
    },
  );

  const isActive = event.status === "pending" && completedInfo === null;
  const badge =
    completedInfo?.type === "confirmed"
      ? { label: "처리완료", cls: "bg-green-100 text-green-600" }
      : completedInfo?.type === "false_alarm"
        ? { label: "오탐", cls: "bg-gray-100 text-gray-500" }
        : getSeverityBadge(event);
  const station = event.camera?.station_name ?? "";
  const gate = event.camera?.location ?? "";
  const locationText =
    station && gate
      ? `${station} ${gate}`
      : station || `카메라 #${event.camera_id}`;

  const handleDispatch = () => {
    const ok = window.confirm("역무원을 파견하시겠습니까?");
    if (ok) setDispatched(true);
  };

  const handleConfirm = async () => {
    const ok = window.confirm("이벤트를 완료 처리 하시겠습니까?");
    if (!ok) return;
    setConfirming(true);
    try {
      await updateEventStatus(event.id, "confirmed");
      const updated = await getEventById(event.id);
      setCompletedInfo({
        type: "confirmed",
        at: updated.handled_at ?? new Date().toISOString(),
      });
      onConfirmed();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  const handleFalseAlarmSubmitted = async (reason: string) => {
    const updated = await getEventById(event.id).catch(() => null);
    setCompletedInfo({
      type: "false_alarm",
      at: updated?.handled_at ?? new Date().toISOString(),
      reason,
    });
    onConfirmed();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-3xl mx-4"
          style={{ maxHeight: "92vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          <EventVideoPanel clipUrl={event.clip_url} />
          <EventInfoPanel
            event={event}
            badge={badge}
            locationText={locationText}
            completedInfo={completedInfo}
            isActive={isActive}
            dispatched={dispatched}
            confirming={confirming}
            onClose={onClose}
            onDispatch={handleDispatch}
            onConfirm={handleConfirm}
            onFalseAlarm={() => setShowFalseAlarm(true)}
          />
        </div>
      </div>

      {showFalseAlarm && (
        <FalseAlarmModal
          event={event}
          onClose={() => setShowFalseAlarm(false)}
          onSubmitted={handleFalseAlarmSubmitted}
        />
      )}
    </>
  );
}
