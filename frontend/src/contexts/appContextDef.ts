import { createContext } from "react";
import type { EventResponse } from "@/types";

export type WsEventListener = (event: EventResponse) => void;

export interface AppContextValue {
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
  unconfirmedCount: number;
  setUnconfirmedCount: (v: number) => void;
  subscribeWsEvent: (cb: WsEventListener) => () => void;
  setLoggedIn: (v: boolean) => void;
}

export const AppContext = createContext<AppContextValue>({
  wsConnected: false,
  setWsConnected: () => {},
  unconfirmedCount: 0,
  setUnconfirmedCount: () => {},
  subscribeWsEvent: () => () => {},
  setLoggedIn: () => {},
});
