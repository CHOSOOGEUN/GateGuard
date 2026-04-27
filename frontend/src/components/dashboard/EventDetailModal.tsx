/**
 * @file components/dashboard/EventDetailModal.tsx
 * @description 알림 상세보기 모달
 *
 * ## 기능
 * - 좌측: events 목록, 클릭 시 우측 상세 전환
 * - 우측: clip_url 영상 + 기록시각 / 위치 / 인상착의 / AI 신뢰도
 * - 처리완료: PATCH /api/events/{id}/status { status: 'confirmed' } 후 닫기
 * - 오탐신고: FalseAlarmModal로 전환
 * - status === "pending" 일 때 역무원파견/처리완료/오탐신고 버튼 표시, 그 외 미표시
 *
 * ## 주의사항
 * - event 데이터는 AlertList의 events 배열 그대로 사용 (별도 단건 조회 없음)
 *
 * ## TODO
 * - [ ] 역무원 파견 API 연동 (백엔드 스펙 미정)
 * - [ ] GET /api/events/{id} 백엔드 구현 후 상세 데이터 별도 조회로 전환
 *
 * ## 협의
 * - clip_url S3 CORS 설정 백엔드(조수근) 확인 필요
 * - appearance_tags, description 필드명 백엔드 확정 후 수정 필요
 */

import { useState } from "react";
import { X, Clock, MapPin, Tag, Video, Zap } from "lucide-react";
import type { EventResponse } from "@/types";
import { updateEventStatus } from "@/api/events";

interface EventDetailModalProps {
  events: EventResponse[];
  initialEvent: EventResponse;
  onClose: () => void;
  onFalseAlarm: (event: EventResponse) => void;
  onConfirmed: () => void;
}

// ── 유틸 ──────────────────────────────────────────────

function formatHMS(timestamp: string): string {
  const d = new Date(timestamp);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function getStatusText(status: EventResponse["status"]): string {
  if (status === "confirmed") return "CONFIRMED";
  if (status === "false_alarm") return "FALSE ALARM";
  return "UNCONFIRMED";
}

function getGateLabel(event: EventResponse): string {
  return event.camera?.location ?? `GATE ${event.camera_id}`;
}

function getSeverityBadge(event: EventResponse): {
  label: string;
  cls: string;
} {
  if (event.status === "confirmed")
    return { label: "처리완료", cls: "bg-green-100 text-green-600" };
  if (event.status === "false_alarm")
    return { label: "오탐", cls: "bg-gray-100 text-gray-500" };
  if ((event.confidence ?? 0) >= 0.7)
    return { label: "고위험", cls: "bg-red-100 text-red-500" };
  return { label: "중간", cls: "bg-yellow-100 text-yellow-600" };
}

// ── 좌측 패널: 이벤트 목록 아이템 ──────────────────────

function ListItem({
  event,
  isSelected,
  onClick,
}: {
  event: EventResponse;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isUnconfirmed = event.status === "pending";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-2.5 rounded-xl transition ${
        isSelected
          ? "bg-red-50 border border-red-300"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      {/* 썸네일 */}
      <div className="relative mb-1.5">
        {event.clip_url ? (
          <video
            src={event.clip_url}
            className="w-full h-16 object-cover rounded-lg bg-gray-800"
          />
        ) : (
          <div className="w-full h-16 rounded-lg bg-gray-800 flex items-center justify-center text-white text-xs font-bold">
            CAM-{String(event.camera_id).padStart(2, "0")}
          </div>
        )}
        {/* 상태 dot */}
        <span
          className={`absolute top-1.5 left-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
            isUnconfirmed ? "bg-red-500" : "bg-gray-400"
          }`}
        />
      </div>
      {/* 이벤트 정보 */}
      <p className="text-xs text-gray-700 leading-tight">
        <span className="font-semibold">Event #{event.id}</span>
        {" | "}
        {formatHMS(event.timestamp)}
        {" | "}
        {getGateLabel(event)}
      </p>
      <p
        className={`text-xs font-medium mt-0.5 ${
          isUnconfirmed ? "text-red-500" : "text-gray-400"
        }`}
      >
        STATUS: {getStatusText(event.status)}
      </p>
    </button>
  );
}

// ── 메인 모달 ─────────────────────────────────────────

export default function EventDetailModal({
  events,
  initialEvent,
  onClose,
  onFalseAlarm,
  onConfirmed,
}: EventDetailModalProps) {
  const [selected, setSelected] = useState<EventResponse>(initialEvent);
  const [confirming, setConfirming] = useState(false);

  const isActive = selected.status === "pending";
  const badge = getSeverityBadge(selected);
  const station = selected.camera?.station_name ?? "";
  const gate = selected.camera?.location ?? "";
  const locationText =
    station && gate
      ? `${station} ${gate}`
      : station || `카메라 #${selected.camera_id}`;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await updateEventStatus(selected.id, "confirmed");
      onConfirmed();
      onClose();
    } catch {
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setConfirming(false);
    }
  };

  const handleDispatch = () => {
    // TODO: 역무원 파견 API 연동 (백엔드 스펙 미정)
    alert("역무원 파견 기능은 준비 중입니다.");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex overflow-hidden w-full max-w-4xl mx-4"
        style={{ maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 좌측: 실시간 알림 목록 ── */}
        <div className="w-56 shrink-0 border-r border-gray-100 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm">실시간 알림</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {events.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-6">
                이벤트 없음
              </p>
            ) : (
              events.map((ev) => (
                <ListItem
                  key={ev.id}
                  event={ev}
                  isSelected={ev.id === selected.id}
                  onClick={() => setSelected(ev)}
                />
              ))
            )}
          </div>
        </div>

        {/* ── 우측: 상세 정보 ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm font-bold text-gray-900 truncate">
                Event #{selected.id}
                <span className="font-normal text-gray-500">
                  {" "}
                  | {formatHMS(selected.timestamp)} | {getGateLabel(selected)} |
                  STATUS:{" "}
                </span>
                <span
                  className={
                    selected.status === "pending"
                      ? "text-red-500"
                      : "text-gray-500"
                  }
                >
                  {getStatusText(selected.status)}
                </span>
              </h2>
              <span
                className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${badge.cls}`}
              >
                {badge.label}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition shrink-0"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* 콘텐츠: 이미지 + 정보 */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* 이미지/영상 */}
            <div className="flex-1 bg-gray-900 flex items-center justify-center">
              {selected.clip_url ? (
                <video
                  src={selected.clip_url}
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

            {/* 정보 + 버튼 */}
            <div className="w-52 shrink-0 flex flex-col justify-between p-5 border-l border-gray-100 overflow-y-auto">
              {/* 정보 섹션 */}
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">기록시각</p>
                    <p className="font-medium">
                      {formatHMS(selected.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm text-gray-700">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">위치</p>
                    <p className="font-medium">{locationText}</p>
                  </div>
                </div>

                {selected.appearance_tags &&
                  selected.appearance_tags.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400 mb-1.5">인상착의</p>
                        <ul className="space-y-1">
                          {selected.appearance_tags.map((tag) => (
                            <li
                              key={tag}
                              className="flex items-center gap-1.5 text-sm text-gray-700"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                              {tag}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                {(selected.event_type ?? selected.description) && (
                  <div className="flex items-start gap-2 text-sm text-gray-700">
                    <Zap className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">감지유형</p>
                      <p className="font-medium">
                        {selected.event_type ?? selected.description}
                      </p>
                    </div>
                  </div>
                )}

                {selected.confidence !== null && (
                  <p className="text-xs text-gray-400">
                    AI 신뢰도: {Math.round((selected.confidence ?? 0) * 100)}%
                  </p>
                )}
              </div>

              {/* 액션 버튼 */}
              {isActive && (
                <div className="mt-5 space-y-2">
                  <p className="text-xs text-gray-400 font-medium mb-1">
                    다음 버튼
                  </p>
                  <button
                    onClick={handleDispatch}
                    className="w-full py-2.5 rounded-xl bg-yellow-400 text-white font-bold text-sm hover:bg-yellow-500 transition"
                  >
                    역무원 파견
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={confirming}
                    className="w-full py-2.5 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition disabled:opacity-60"
                  >
                    {confirming ? "처리 중..." : "처리완료"}
                  </button>
                  <button
                    onClick={() => onFalseAlarm(selected)}
                    className="w-full py-2.5 rounded-xl bg-red-400 text-white font-bold text-sm hover:bg-red-500 transition"
                  >
                    오탐신고
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
