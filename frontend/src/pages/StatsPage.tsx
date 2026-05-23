import { useState, useEffect, useMemo } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatSummaryCards from "@/components/stats/StatSummaryCards";
import DailyTrendChart from "@/components/stats/DailyTrendChart";
import EventTypeChart from "@/components/stats/EventTypeChart";
import HourlyDistributionChart from "@/components/stats/HourlyDistributionChart";
import FalseAlarmTable from "@/components/stats/FalseAlarmTable";
import CameraRankingTable from "@/components/stats/CameraRankingTable";
import {
  getEvents,
  getEventStats,
  getEventStatsByCamera,
  getEventStatsByType,
  getEventStatsHourly,
  getEventStatsDaily,
} from "@/api/events";
import { getCameras } from "@/api/cameras";
import { buildFalseAlarmData, DAILY_DAYS } from "@/lib/stats";
import { labelEventType } from "@/constants/eventTypes";
import type {
  EventResponse,
  EventStats,
  CameraEventStats,
  CameraResponse,
  EventTypeStat,
  HourlyStat,
  DailyStat,
} from "@/types";

const HOUR_SLOTS = [
  "00-02", "02-04", "04-06", "06-08", "08-10", "10-12",
  "12-14", "14-16", "16-18", "18-20", "20-22", "22-24",
];

export default function StatsPage() {
  // falseAlarm reason 집계 + 평균값 계산용 (서버 엔드포인트 없음)
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  // 서버 집계 결과 (PR #31)
  const [typeStats, setTypeStats] = useState<EventTypeStat[]>([]);
  const [hourlyStats, setHourlyStats] = useState<HourlyStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [evResult, statsResult, camStatsResult, camResult, typeResult, hourlyResult, dailyResult] =
        await Promise.allSettled([
          getEvents({ limit: 1000 }),
          getEventStats(),
          getEventStatsByCamera(),
          getCameras(),
          getEventStatsByType(),
          getEventStatsHourly(),
          getEventStatsDaily(DAILY_DAYS),
        ]);
      if (evResult.status === "fulfilled") setEvents(evResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (typeResult.status === "fulfilled") setTypeStats(typeResult.value);
      if (hourlyResult.status === "fulfilled") setHourlyStats(hourlyResult.value);
      if (dailyResult.status === "fulfilled") setDailyStats(dailyResult.value);
      if (camStatsResult.status === "fulfilled") {
        const cameraMap = new Map<number, CameraResponse>(
          camResult.status === "fulfilled"
            ? camResult.value.map((c) => [c.id, c])
            : []
        );
        setCameraStats(
          camStatsResult.value
            .map((s) => ({
              ...s,
              station_name: cameraMap.get(s.camera_id)?.station_name ?? `CAM-${s.camera_id}`,
              location: cameraMap.get(s.camera_id)?.location ?? "",
            }))
            .sort((a, b) => b.count - a.count)
        );
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // 일별 추이 — 서버 응답을 `MM/DD` 키 record 로 변환 (최근 DAILY_DAYS 일)
  const dailyData = useMemo(() => {
    const result: Record<string, number> = {};
    for (let i = DAILY_DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result[`${d.getMonth() + 1}/${d.getDate()}`] = 0;
    }
    dailyStats.forEach((s) => {
      const d = new Date(s.day);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      if (key in result) result[key] = s.count;
    });
    return result;
  }, [dailyStats]);

  // 시간대(서버 0~23) → 2시간 슬롯 record 로 합산
  const hourlyData = useMemo(() => {
    const result: Record<string, number> = Object.fromEntries(HOUR_SLOTS.map((s) => [s, 0]));
    hourlyStats.forEach((h) => {
      const start = Math.floor(h.hour / 2) * 2;
      const key = `${String(start).padStart(2, "0")}-${String(start + 2).padStart(2, "0")}`;
      if (key in result) result[key] += h.count;
    });
    return result;
  }, [hourlyStats]);

  // event_type → 한글 label
  const typeData = useMemo(() => {
    const result: Record<string, number> = {};
    typeStats.forEach((t) => {
      const label = labelEventType(t.event_type);
      result[label] = (result[label] ?? 0) + t.count;
    });
    return result;
  }, [typeStats]);

  // 오탐 reason 집계 — 서버 엔드포인트 없어 events 1000건 기준 클라 집계
  const falseAlarmData = useMemo(() => buildFalseAlarmData(events), [events]);

  const avgDaily = useMemo(() => {
    if (events.length === 0) return null;
    const timestamps = events.map((e) => new Date(e.timestamp).getTime());
    const minDay = new Date(Math.min(...timestamps));
    const maxDay = new Date(Math.max(...timestamps));
    minDay.setHours(0, 0, 0, 0);
    maxDay.setHours(0, 0, 0, 0);
    const totalDays = Math.max(
      1,
      Math.round((maxDay.getTime() - minDay.getTime()) / 86400000) + 1,
    );
    return events.length / totalDays;
  }, [events]);

  const avgProcessMin = useMemo(() => {
    const handled = events.filter(
      (e) => e.status === "confirmed" && e.handled_at && e.timestamp,
    );
    if (handled.length === 0) return null;
    const totalMs = handled.reduce((sum, e) => {
      return (
        sum +
        (new Date(e.handled_at!).getTime() - new Date(e.timestamp).getTime())
      );
    }, 0);
    return totalMs / handled.length / 60000; // ms → 분
  }, [events]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* 데이터 범위 안내 */}
          <p className="text-xs text-gray-400">
            ※ 차트(일별·시간대별·유형별)는 서버에서 전체 데이터 기준으로 집계됩니다. 오탐 사유·평균 처리시간은 최근 1,000건 기준.
          </p>

          {/* 요약 카드 */}
          <StatSummaryCards
            stats={stats}
            events={events}
            avgDaily={avgDaily}
            avgProcessMin={avgProcessMin}
            loading={loading}
          />

          {/* 일별 추이 + 감지 유형 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  일별 발생 추이
                </span>
                <span className="text-xs text-gray-400">
                  최근 {DAILY_DAYS}일
                </span>
              </div>
              {loading ? (
                <div className="h-[200px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />
              ) : (
                <DailyTrendChart data={dailyData} />
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  감지 유형 비율
                </span>
                <span className="text-xs text-gray-400">전체 기간</span>
              </div>
              {loading ? (
                <div className="h-[200px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />
              ) : (
                <EventTypeChart data={typeData} />
              )}
            </div>
          </div>

          {/* 시간대별 분포 + 오탐신고 현황 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  시간대별 발생 분포
                </span>
                <span className="text-xs text-gray-400">0시 — 23시</span>
              </div>
              {loading ? (
                <div className="h-[300px] animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl" />
              ) : (
                <HourlyDistributionChart data={hourlyData} />
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  오탐신고 현황
                </span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 animate-pulse bg-gray-100 dark:bg-gray-700 rounded"
                    />
                  ))}
                </div>
              ) : (
                <FalseAlarmTable data={falseAlarmData} />
              )}
            </div>
          </div>

          {/* 역별/게이트별 발생 순위 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                역별 / 게이트별 발생 순위
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse bg-gray-100 dark:bg-gray-700 rounded"
                  />
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
