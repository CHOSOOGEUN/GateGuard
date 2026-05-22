// WebSocket 훅 — 연결 끊기면 3초 후 자동 재연결, onMessage는 ref로 관리해 리렌더 없이 최신 핸들러 유지
import { useEffect, useRef, useState } from 'react';
import { WS_URL } from '@/constants/config';

export interface WsMessage {
  type: string;
  data: unknown;
}

/**
 * 웹(frontend/src/hooks/useWebSocket.ts)과 동일한 패턴.
 * - onMessage를 ref로 관리 → 리렌더 없이 최신 핸들러 유지
 * - per-effect `let active` 패턴 → StrictMode 이중 마운트 방지
 * - 연결 끊기면 3초 후 자동 재연결
 */
export function useWebSocket(onMessage: (msg: WsMessage) => void): { connected: boolean } {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;

    function connect(): WebSocket {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => { if (active) setConnected(true); };

      ws.onmessage = (e) => {
        try {
          const msg: WsMessage = JSON.parse(e.data as string);
          onMessageRef.current(msg);
        } catch { /* 잘못된 메시지 무시 */ }
      };

      ws.onclose = () => {
        if (active) {
          setConnected(false);
          setTimeout(connect, 3_000);
        }
      };

      ws.onerror = () => ws.close();

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
