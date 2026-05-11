import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatSummaryCards from "@/components/stats/StatSummaryCards";
import DailyTrendChart from "@/components/stats/DailyTrendChart";
import EventTypeChart from "@/components/stats/EventTypeChart";
import HourlyDistributionChart from "@/components/stats/HourlyDistributionChart";
import FalseAlarmTable from "@/components/stats/FalseAlarmTable";
import CameraRankingTable from "@/components/stats/CameraRankingTable";
import { getEvents, getEventStats, getEventStatsByCamera } from "@/api/events";
import { labelEventType } from "@/constants/eventTypes";
import type { EventResponse, EventStats, CameraEventStats } from "@/types";

const DAILY_DAYS = 12;

function buildDailyData(events: EventResponse[]) {
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

function buildHourlyData(events: EventResponse[]) {
  const slots = [
    "00-02","02-04","04-06","06-08","08-10","10-12",
    "12-14","14-16","16-18","18-20","20-22","22-24",
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

function buildTypeData(events: EventResponse[]) {
  const result: Record<string, number> = {};
  events.forEach((e) => {
    if (!e.event_type || e.event_type === "normal" || e.event_type === "unknown") return;
    const label = labelEventType(e.event_type);
    result[label] = (result[label] ?? 0) + 1;
  });
  return result;
}

function buildFalseAlarmData(events: EventResponse[]) {
  const result: Record<string, number> = {};
  events
    .filter((e) => e.status === "false_alarm")
    .forEach((e) => {
      const reason = e.reason ?? "기타";
      result[reason] = (result[reason] ?? 0) + 1;
    });
  return result;
}

export default function StatsPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [evResult, statsResult, camStatsResult] = await Promise.allSettled([
        getEvents({ limit: 1000 }),
        getEventStats(),
        getEventStatsByCamera(),
      ]);
      if (evResult.status === "fulfilled") setEvents(evResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (camStatsResult.status === "fulfilled") setCameraStats(camStatsResult.value);
      setLoading(false);
    };
    fetch();
  }, []);

  const dailyData = useMemo(() => buildDailyData(events), [events]);
  const hourlyData = useMemo(() => buildHourlyData(events), [events]);
  const typeData = useMemo(() => buildTypeData(events), [events]);
  const falseAlarmData = useMemo(() => buildFalseAlarmData(events), [events]);

  const avgDaily = useMemo(() => {
    const days = Object.values(dailyData);
    const total = days.reduce((s, v) => s + v, 0);
    const activeDays = days.filter((v) => v > 0).length;
    return activeDays > 0 ? total / activeDays : null;
  }, [dailyData]);

  const avgProcessMin = useMemo(() => {
    const handled = events.filter(
      (e) => e.status === "confirmed" && e.handled_at && e.timestamp,
    );
    if (handled.length === 0) return null;
    const totalMs = handled.reduce((sum, e) => {
      return sum + (new Date(e.handled_at!).getTime() - new Date(e.timestamp).getTime());
    }, 0);
    return totalMs / handled.length / 60000; // ms → 분
  }, [events]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* 요약 카드 */}
          <StatSummaryCards stats={stats} avgDaily={avgDaily} avgProcessMin={avgProcessMin} loading={loading} />

          {/* 일별 추이 + 감지 유형 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">일별 발생 추이</span>
                <span className="text-xs text-gray-400">최근 {DAILY_DAYS}일</span>
              </div>
              {loading ? (
                <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <DailyTrendChart data={dailyData} />
              )}
            </div>

            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">감지 유형 비율</span>
                <span className="text-xs text-gray-400">전체 기간</span>
              </div>
              {loading ? (
                <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <EventTypeChart data={typeData} />
              )}
            </div>
          </div>

          {/* 시간대별 분포 + 오탐신고 현황 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">시간대별 발생 분포</span>
                <span className="text-xs text-gray-400">0시 — 23시</span>
              </div>
              {loading ? (
                <div className="h-[300px] animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <HourlyDistributionChart data={hourlyData} />
              )}
            </div>

            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700">오탐신고 현황</span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 animate-pulse bg-gray-100 rounded" />
                  ))}
                </div>
              ) : (
                <FalseAlarmTable data={falseAlarmData} />
              )}
            </div>
          </div>

          {/* 역별/게이트별 발생 순위 */}
          <div className="bg-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700">역별 / 게이트별 발생 순위</span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse bg-gray-100 rounded" />
                ))}
              </div>
            ) : (
              <CameraRankingTable data={cameraStats} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
