// 날짜/시각 포맷 유틸 — formatTime / formatRelativeDate / formatFullTimestamp

/** 타임스탬프 → "HH시 MM분" */
export function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}시 ${m}분`;
}

/** 타임스탬프 → "방금 전 / 오늘 HH:MM / 어제 HH:MM" */
export function formatRelativeDate(timestamp: string): string {
  const d = new Date(timestamp);
  const now = new Date();
  const diffH = Math.floor((now.getTime() - d.getTime()) / 3_600_000);
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  if (diffH < 1) return '방금 전';
  if (diffH < 24) return `오늘 ${hm}`;
  return `어제 ${hm}`;
}

/** 타임스탬프 → "YYYY.MM.DD | HH:MM:SS" */
export function formatFullTimestamp(timestamp: string): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} | ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
