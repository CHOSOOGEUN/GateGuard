/**
 * @file hooks/useWebSocket.ts
 * @description WebSocket 연결 및 실시간 이벤트 수신 훅
 *
 * ## 기능
 * - ws://localhost:8000/ws/events 연결 및 NEW_EVENT 메시지 수신
 * - 연결 끊김 시 3초 후 자동 재연결
 * - per-effect `let active` 패턴으로 React StrictMode 이중 마운트 시 WebSocket 이중 연결 방지
 * - onMessage 콜백을 ref로 관리하여 리렌더링 없이 최신 핸들러 유지
 *
 * ## 주의사항
 * - WS_URL 하드코딩 → 배포 시 실서버 주소로 변경 필요 (axios.ts의 baseURL과 동일 호스트)
 *
 * ## TODO
 * - [ ] WS_URL → import.meta.env.VITE_WS_URL 환경변수로 분리
 * - [ ] connected 상태 반환하여 Header 실시간 모니터링 뱃지 연동
 */

import { useEffect, useRef } from "react";

// axios baseURL과 일치시키기 위해 동일 호스트 사용
const WS_URL = "ws://localhost:8000/ws/events";

export interface WsMessage {
  type: string;
  data: unknown;
}

/**
 * WebSocket 연결을 관리하는 훅.
 * 연결이 끊어지면 3초 후 자동 재연결.
 * onMessage 콜백은 ref로 관리하여 리렌더링 없이 최신 참조 유지.
 */
export function useWebSocket(onMessage: (msg: WsMessage) => void) {
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    // 클로저 로컬 변수로 관리 — ref 공유 시 StrictMode 이중 실행에서 발생하는
    // activeRef 경쟁 조건(WS가 2개 생성되는 버그)을 방지
    onMessageRef.current = onMessage;
    let active = true;

    function connect(): WebSocket {
      const ws = new WebSocket(WS_URL);

      ws.onmessage = (event) => {
        try {
          const msg: WsMessage = JSON.parse(event.data as string);
          onMessageRef.current(msg);
        } catch {
          // 잘못된 메시지 무시
        }
      };

      ws.onclose = () => {
        if (active) setTimeout(connect, 3000);
      };

      return ws;
    }

    const ws = connect();

    return () => {
      active = false;
      ws.close();
    };
  }, []);
}
