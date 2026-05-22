/**
 * @file hooks/useWebSocket.ts
 * @description WebSocket 연결 및 실시간 이벤트 수신 훅
 *
 * ## 기능
 * - VITE_WS_URL 연결, NEW_EVENT 메시지 수신
 * - 연결 끊김 시 3초 후 자동 재연결
 * - connected 상태 반환 → AppContext를 통해 Header 뱃지 연동
 * - per-effect `let active` 패턴으로 React StrictMode 이중 마운트 시 WebSocket 이중 연결 방지
 * - onMessage 콜백을 ref로 관리하여 리렌더링 없이 최신 핸들러 유지
 *
 * ## 주의사항
 * - WS_URL은 VITE_WS_URL 환경변수로 관리 (.env 파일 참고)
 */

import { useEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL as string;

export interface WsMessage {
  type: string;
  data: unknown;
}

/**
 * WebSocket 연결을 관리하는 훅.
 * 연결이 끊어지면 3초 후 자동 재연결.
 * onMessage 콜백은 ref로 관리하여 리렌더링 없이 최신 참조 유지.
 * @returns { connected } — 현재 WebSocket 연결 여부
 */
export function useWebSocket(onMessage: (msg: WsMessage) => void): {
  connected: boolean;
} {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage; // 매 렌더마다 최신 콜백으로 갱신

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    function connect(): WebSocket {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        if (active) setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data as string);
          onMessageRef.current(msg);
        } catch {
          // 잘못된 메시지 무시
        }
      };

      ws.onclose = () => {
        if (active) {
          setConnected(false);
          setTimeout(connect, 3000);
        }
      };

      return ws;
    }

    const ws = connect();

    return () => {
      active = false;
      setConnected(false);
      ws.close();
    };
  }, []);

  return { connected };
}
