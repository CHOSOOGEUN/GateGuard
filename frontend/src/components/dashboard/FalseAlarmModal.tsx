/**
 * @file components/dashboard/FalseAlarmModal.tsx
 * @description 오탐신고 모달 컴포넌트
 *
 * ## 기능
 * - 오탐 사유 4가지 라디오 선택 (기타 선택 시 직접 입력)
 * - POST /api/events/{id}/false-alarm { reason, memo? } 호출 후 닫기
 * - AlertItem 또는 EventDetailModal의 오탐신고 버튼으로 진입
 *
 * ## 주의사항
 * - 오탐신고 완료 후 onSubmitted() 콜백으로 DashboardPage/EventsPage의 refresh() 호출
 * - POST /api/events/{id}/false-alarm 백엔드 M2 구현 예정
 *
 * ## 백엔드 확정 후 수정 필요
 * - 요청 바디 필드명 ({ reason, memo? }) 확정 필요
 */

import { useState } from "react";
import { X } from "lucide-react";
import type { EventResponse } from "@/types";
import { reportFalseAlarm } from "@/api/events";

interface FalseAlarmModalProps {
  event: EventResponse;
  onClose: () => void;
  onSubmitted: () => void;
}

const REASONS = [
  "정상태그이나 인식 지연",
  "단순 시스템 오류",
  "기계 결함",
  "기타",
] as const;

export default function FalseAlarmModal({
  event,
  onClose,
  onSubmitted,
}: FalseAlarmModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const locationText = event.camera
    ? `${event.camera.station_name} ${event.camera.location}`
    : `카메라 #${event.camera_id}`;

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError("오탐 사유를 선택해주세요.");
      return;
    }
    if (selectedReason === "기타" && !memo.trim()) {
      setError("사유를 직접 입력해주세요.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const reason = selectedReason === "기타" ? memo.trim() : selectedReason;
      await reportFalseAlarm(event.id, {
        reason,
        memo: selectedReason === "기타" ? memo.trim() : undefined,
      });
      onSubmitted();
      onClose();
    } catch {
      setError("오탐 신고 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">오탐신고</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 사건사진 (기능명세서: EventResponse.clip_url 활용) */}
        <div className="bg-gray-900 aspect-video flex items-center justify-center">
          {event.clip_url ? (
            <video
              src={event.clip_url}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <span className="text-sm">영상 클립 없음</span>
            </div>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* 이벤트 요약 */}
          <div className="bg-gray-50 rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-gray-800">{locationText}</p>
            <p className="text-xs mt-0.5 text-gray-400">이벤트 #{event.id}</p>
          </div>

          {/* 오탐 사유 선택 */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-gray-800">오탐 사유</p>
            {REASONS.map((reason) => (
              <label
                key={reason}
                className="flex items-center gap-3 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason}
                  checked={selectedReason === reason}
                  onChange={() => setSelectedReason(reason)}
                  className="accent-[#4B73F7] w-4 h-4"
                />
                <span className="text-sm text-gray-700">{reason}</span>
              </label>
            ))}
          </div>

          {/* 기타 직접 입력 */}
          {selectedReason === "기타" && (
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="사유를 직접 입력해주세요."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-gray-100 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7] resize-none"
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* 버튼 */}
        <div className="px-6 pb-5 flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-full bg-[#4B73F7] text-white font-semibold text-sm hover:bg-[#3a62e6] transition disabled:opacity-60"
          >
            {loading ? "신고 중..." : "오탐신고 완료"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
