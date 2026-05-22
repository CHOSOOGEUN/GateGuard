/**
 * @file pages/DashboardPage.tsx
 * @description 대시보드 메인 페이지 — 데이터 페칭 및 상태 관리 총괄
 *
 * ## 기능
 * - 마운트 시 5개 API 병렬 호출 (Promise.allSettled):
 *   - GET /api/cameras/               카메라 목록 (위치 정보 조인용)
 *   - GET /api/events/?limit=10       최신 이벤트 10건
 *   - GET /api/events/stats           통계 카드 데이터
 *   - GET /api/events/stats/by-camera 구간별 알림현황
 *   - GET /api/notifications/?unread_only=false 오탐 신고 목록
 * - cameraMapRef로 카메라 맵 관리: WebSocket 핸들러에서도 최신 맵을 참조하여 역이름/게이트 조인
 * - WebSocket NEW_EVENT 수신 시 카메라 정보 조인 후 목록 맨 앞 삽입, 최대 10건 유지, stats 낙관적 업데이트
 * - 처리완료 / 오탐신고 완료 후 refresh()로 전체 상태 재동기화
 *
 * ## 주의사항
 * - 백엔드 미구현 API (stats, stats/by-camera, false-alarm, status) 실패 시 null/빈 배열로 graceful fallback
 * - 401 응답은 axios interceptor가 자동으로 `/`로 리다이렉트 처리
 *
 * ## 주의사항 (추가)
 * - AppContext를 통해 wsConnected, unconfirmedCount를 Sidebar/Header에 공유
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppContext } from "@/contexts/AppContext";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import StatCards from "@/components/dashboard/StatCards";
import AlertList from "@/components/dashboard/AlertList";
import CameraStats from "@/components/dashboard/CameraStats";
import FalseAlarmList from "@/components/dashboard/FalseAlarmList";
import EventDetailModal from "@/components/dashboard/EventDetailModal";
import FalseAlarmModal from "@/components/dashboard/FalseAlarmModal";
import { getEvents, getEventStats, getEventStatsByCamera } from "@/api/events";
import { getNotifications } from "@/api/notifications";
import { getCameras } from "@/api/cameras";
import { useWebSocket } from "@/hooks/useWebSocket";
import type {
  EventResponse,
  EventStats,
  CameraEventStats,
  CameraResponse,
  NotificationResponse,
} from "@/types";

export default function DashboardPage() {
  const { setWsConnected, setUnconfirmedCount } = useAppContext();
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [cameraStats, setCameraStats] = useState<CameraEventStats[]>([]);
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);

  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [loadingNotif, setLoadingNotif] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<EventResponse | null>(null);
  const [falseAlarmEvent, setFalseAlarmEvent] = useState<EventResponse | null>(null);

  // WebSocket 핸들러에서도 최신 카메라 맵을 참조하기 위해 ref 사용
  const cameraMapRef = useRef<Map<number, CameraResponse>>(new Map());

  const refresh = useCallback(async () => {
    setLoadingEvents(true);
    setLoadingStats(true);
    setLoadingCamera(true);
    setLoadingNotif(true);

    const [camResult, evResult, statsResult, camStatsResult, notifResult] =
      await Promise.allSettled([
        getCameras(),
        getEvents({ limit: 10 }),
        getEventStats(),
        getEventStatsByCamera(),
        getNotifications({ unread_only: false }),
      ]);

    // 카메라 맵 먼저 구성 (이벤트 조인에 필요)
    if (camResult.status === "fulfilled") {
      cameraMapRef.current = new Map(camResult.value.map((c) => [c.id, c]));
    }

    // 이벤트에 카메라 정보 조인
    if (evResult.status === "fulfilled") {
      setEvents(
        evResult.value.map((e) => ({
          ...e,
          camera: cameraMapRef.current.get(e.camera_id) ?? e.camera,
        })),
      );
    }
    setLoadingEvents(false);

    if (statsResult.status === "fulfilled") setStats(statsResult.value);
    setLoadingStats(false);

    if (camStatsResult.status === "fulfilled") setCameraStats(camStatsResult.value);
    setLoadingCamera(false);

    if (notifResult.status === "fulfilled") setNotifications(notifResult.value);
    setLoadingNotif(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // WebSocket 연결 상태 → AppContext 동기화
  const { connected } = useWebSocket((msg) => {
    if (msg.type === "NEW_EVENT") {
      const newEvent = msg.data as EventResponse;
      // 카메라 정보 조인 후 목록 맨 앞 삽입, 최대 10건 유지
      const enriched: EventResponse = {
        ...newEvent,
        camera: cameraMapRef.current.get(newEvent.camera_id) ?? newEvent.camera,
      };
      setEvents((prev) => [enriched, ...prev].slice(0, 10));
      // 통계 카드 낙관적 업데이트
      setStats((prev) =>
        prev
          ? {
              ...prev,
              today_total: prev.today_total + 1,
              pending: prev.pending + 1,
            }
          : prev,
      );
    }
  });

  const unconfirmedCount = events.filter(
    (e) => e.status === "pending",
  ).length;

  useEffect(() => {
    setWsConnected(connected);
  }, [connected, setWsConnected]);

  useEffect(() => {
    setUnconfirmedCount(unconfirmedCount);
  }, [unconfirmedCount, setUnconfirmedCount]);

  const handleOpenFalseAlarm = (event: EventResponse) => {
    setSelectedEvent(null);
    setFalseAlarmEvent(event);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-5">
          {/* 통계 카드 */}
          <StatCards stats={stats} loading={loadingStats} />

          {/* 메인 콘텐츠 */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* 최신알림 */}
            <AlertList
              events={events}
              loading={loadingEvents}
              unconfirmedCount={unconfirmedCount}
              onDetail={setSelectedEvent}
              onFalseAlarm={handleOpenFalseAlarm}
            />

            {/* lg 미만에서는 하단으로: 구간별 알림현황 + 최근 오탐 신고 */}
            <div className="w-full lg:w-[340px] shrink-0 space-y-4">
              <CameraStats data={cameraStats} loading={loadingCamera} />
              <FalseAlarmList
                notifications={notifications}
                loading={loadingNotif}
              />
            </div>
          </div>
        </main>
      </div>

      {/* 이벤트 상세 모달 */}
      {selectedEvent && (
        <EventDetailModal
          events={events}
          initialEvent={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onFalseAlarm={handleOpenFalseAlarm}
          onConfirmed={refresh}
        />
      )}

      {/* 오탐신고 모달 */}
      {falseAlarmEvent && (
        <FalseAlarmModal
          event={falseAlarmEvent}
          onClose={() => setFalseAlarmEvent(null)}
          onSubmitted={refresh}
        />
      )}
    </div>
  );
}
