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
import { getCameras } from "@/api/cameras";
import {
  buildDailyData,
  buildHourlyData,
  buildTypeData,
  buildFalseAlarmData,
  DAILY_DAYS,
} from "@/lib/stats";
import type { EventResponse, EventStats, CameraEventStats, CameraResponse } from "@/types";

export default function StatsPage() {
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const [evResult, statsResult, camStatsResult, camResult] = await Promise.allSettled([
        getEvents({ limit: 1000 }),
        getEventStats(),
        getEventStatsByCamera(),
        getCameras(),
      ]);
      if (evResult.status === "fulfilled") setEvents(evResult.value);
      if (statsResult.status === "fulfilled") setStats(statsResult.value);
      if (camStatsResult.status === "fulfilled") {
        const cameraMap = new Map<number, CameraResponse>(
          camResult.status === "fulfilled"
            ? camResult.value.map((c) => [c.id, c])
            : []
        );
        setCameraStats(
          camStatsResult.value.map((s) => ({
            ...s,
            station_name: cameraMap.get(s.camera_id)?.station_name ?? `CAM-${s.camera_id}`,
            location: cameraMap.get(s.camera_id)?.location ?? "",
          }))
        );
      }
      setLoading(false);
    };
    fetch();
  }, []);

  const dailyData = useMemo(() => buildDailyData(events), [events]);
  const hourlyData = useMemo(() => buildHourlyData(events), [events]);
  const typeData = useMemo(() => buildTypeData(events), [events]);
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
            ※ 통계는 최근 수집된 최대 1,000건의 이벤트를 기준으로 산출됩니다.
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
            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  일별 발생 추이
                </span>
                <span className="text-xs text-gray-400">
                  최근 {DAILY_DAYS}일
                </span>
              </div>
              {loading ? (
                <div className="h-[200px] animate-pulse bg-gray-100 rounded-xl" />
              ) : (
                <DailyTrendChart data={dailyData} />
              )}
            </div>

            <div className="bg-white rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">
                  감지 유형 비율
                </span>
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
                <span className="text-sm font-semibold text-gray-700">
                  시간대별 발생 분포
                </span>
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
                <span className="text-sm font-semibold text-gray-700">
                  오탐신고 현황
                </span>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 animate-pulse bg-gray-100 rounded"
                    />
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
              <span className="text-sm font-semibold text-gray-700">
                역별 / 게이트별 발생 순위
              </span>
            </div>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 animate-pulse bg-gray-100 rounded"
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
