import { useEffect, useLayoutEffect, useRef, useState } from "react";

const WS_URL = import.meta.env.VITE_WS_URL as string;

export interface WsMessage {
  type: string;
  data: unknown;
}

export function useWebSocket(
  onMessage: (msg: WsMessage) => void,
  enabled = true,
): {
  connected: boolean;
} {
  const onMessageRef = useRef(onMessage);
  useLayoutEffect(() => {
    onMessageRef.current = onMessage;
  });

  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;

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
