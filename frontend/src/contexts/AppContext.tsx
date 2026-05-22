/**
 * @file contexts/AppContext.tsx
 * @description 앱 전역 상태 컨텍스트
 *
 * ## 공유 상태
 * - wsConnected: WebSocket 연결 여부 → Header 실시간 모니터링 뱃지 on/off
 * - unconfirmedCount: 미확인 이벤트 수 → Sidebar 빨간 뱃지
 *
 * ## 사용처
 * - wsConnected 설정: DashboardPage, EventsPage (useWebSocket 연결 시)
 * - unconfirmedCount 설정: DashboardPage
 * - 읽기: Header (wsConnected), Sidebar (unconfirmedCount)
 */

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

interface AppContextValue {
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
  unconfirmedCount: number;
  setUnconfirmedCount: (v: number) => void;
}

const AppContext = createContext<AppContextValue>({
  wsConnected: false,
  setWsConnected: () => {},
  unconfirmedCount: 0,
  setUnconfirmedCount: () => {},
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [wsConnected, setWsConnected] = useState(false);
  const [unconfirmedCount, setUnconfirmedCount] = useState(0);

  return (
    <AppContext.Provider
      value={{ wsConnected, setWsConnected, unconfirmedCount, setUnconfirmedCount }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
