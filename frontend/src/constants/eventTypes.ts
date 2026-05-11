export const EVENT_TYPE_LABEL: Record<string, string> = {
  tailgating: "테일게이팅",
  jump: "점프 통과",
  crawling: "기어서 통과",
  unpaid: "태그 없이 통행",
  emergencydoor: "비상문 진입",
  normal: "정상",
  unknown: "알 수 없음",
};

export const EVENT_TYPE_OPTIONS = [
  { value: "", label: "전체 유형" },
  { value: "tailgating", label: "테일게이팅" },
  { value: "jump", label: "점프 통과" },
  { value: "crawling", label: "기어서 통과" },
  { value: "unpaid", label: "태그 없이 통행" },
  { value: "emergencydoor", label: "비상문 진입" },
];

export function labelEventType(raw: string): string {
  return EVENT_TYPE_LABEL[raw] ?? raw;
}
