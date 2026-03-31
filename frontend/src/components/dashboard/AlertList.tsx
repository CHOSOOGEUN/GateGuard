import { useEffect, useState } from "react";
import api from "@/api/axios";

interface Event {
  id: number;
  camera_id: number;
  timestamp: string;
  status: string;
  confidence: number;
  track_id: number;
}

export default function AlertList() {
  const [events, setEvents] = useState<Event[]>([]);

  // 📡 실시간 연동 (WebSocket & Initial Fetch)
  useEffect(() => {
    // 1. 기존 데이터 로드 (Initial Fetch)
    const fetchEvents = async () => {
      try {
        const res = await api.get("/api/events/");
        setEvents(res.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };
    fetchEvents();

    // 2. 실시간 웹소켓 연결
    const ws = new WebSocket("ws://localhost:8000/ws");
    
    ws.onmessage = (msg) => {
      const payload = JSON.parse(msg.data);
      if (payload.type === "NEW_EVENT") {
        setEvents((prev) => [payload.data, ...prev].slice(0, 50));
        console.log("🚀 [REAL-TIME] New Event Received:", payload.data);
      }
    };

    return () => ws.close();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">실시간 무임승차 기탐지 현황</h2>
        <span className="px-2 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full animate-pulse">
          Live Monitoring...
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
             <p className="text-gray-400">현재 감지된 무임승차 사건이 없습니다.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="p-4 bg-white border border-red-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-1 text-[10px] font-bold text-white bg-red-500 rounded-lg uppercase">
                  Alert
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-800">광교중앙역 2번 게이트 (ID: {event.camera_id})</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>신뢰도: {(event.confidence * 100).toFixed(1)}%</span>
                <span>Track ID: {event.track_id}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
