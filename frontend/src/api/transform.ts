import type { EventResponse } from "@/types";

// 백엔드가 오탐 상태를 "dismissed"로 저장하나 프론트 기준은 "false_alarm"
// 백엔드에서 수정되면 이 파일 삭제

export function normalizeEvent(e: EventResponse): EventResponse {
  if ((e.status as string) === "dismissed") {
    return { ...e, status: "false_alarm" };
  }
  return e;
}

// 쿼리 파라미터: 프론트가 "false_alarm"으로 보내면 백엔드 실제값 "dismissed"로 변환
export function normalizeStatusParam(status?: string): string | undefined {
  if (status === "false_alarm") return "dismissed";
  return status;
}
