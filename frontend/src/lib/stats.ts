import { labelEventType } from "@/constants/eventTypes";
import type { EventResponse } from "@/types";

const DAILY_DAYS = 12;

export function buildDailyData(events: EventResponse[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = DAILY_DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
  }
  events.forEach((e) => {
    const d = new Date(e.timestamp);
    const key = `${d.getMonth() + 1}/${d.getDate()}`;
    if (key in result) result[key]++;
  });
  return result;
}

export function buildHourlyData(events: EventResponse[]): Record<string, number> {
  const slots = [
    "00-02", "02-04", "04-06", "06-08", "08-10", "10-12",
    "12-14", "14-16", "16-18", "18-20", "20-22", "22-24",
  ];
  const result: Record<string, number> = Object.fromEntries(slots.map((s) => [s, 0]));
  events.forEach((e) => {
    const h = new Date(e.timestamp).getHours();
    const start = Math.floor(h / 2) * 2;
    const key = `${String(start).padStart(2, "0")}-${String(start + 2).padStart(2, "0")}`;
    if (key in result) result[key]++;
  });
  return result;
}

export function buildTypeData(events: EventResponse[]): Record<string, number> {
  const result: Record<string, number> = {};
  events.forEach((e) => {
    if (!e.event_type || e.event_type === "normal" || e.event_type === "unknown") return;
    const label = labelEventType(e.event_type);
    result[label] = (result[label] ?? 0) + 1;
  });
  return result;
}

export function buildFalseAlarmData(events: EventResponse[]): Record<string, number> {
  const result: Record<string, number> = {};
  events
    .filter((e) => e.status === "false_alarm")
    .forEach((e) => {
      const reason = e.reason ?? "기타";
      result[reason] = (result[reason] ?? 0) + 1;
    });
  return result;
}

export { DAILY_DAYS };
