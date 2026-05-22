import { useState, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { AppContext } from "./appContextDef";
import type { WsEventListener } from "./appContextDef";
import { useWebSocket } from "@/hooks/useWebSocket";
import type { EventResponse } from "@/types";
import { normalizeEvent } from "@/api/transform";

export function AppProvider({ children }: { children: ReactNode }) {
  const [unconfirmedCount, setUnconfirmedCount] = useState(0);
  const [loggedIn, setLoggedIn] = useState(
    () => !!(localStorage.getItem("token") || sessionStorage.getItem("token")),
  );
  const listenersRef = useRef<Set<WsEventListener>>(new Set());

  const subscribeWsEvent = useCallback((cb: WsEventListener) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const { connected } = useWebSocket((msg) => {
    if (msg.type !== "NEW_EVENT") return;
    const event = normalizeEvent(msg.data as EventResponse);

    setUnconfirmedCount((prev) => prev + 1);

    toast.error("새로운 이벤트 감지됨", {
      description: "대시보드에서 확인하세요.",
      duration: 5000,
    });

    listenersRef.current.forEach((cb) => cb(event));
  }, loggedIn);

  return (
    <AppContext.Provider
      value={{
        wsConnected: connected,
        setWsConnected: () => {},
        unconfirmedCount,
        setUnconfirmedCount,
        subscribeWsEvent,
        setLoggedIn,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
