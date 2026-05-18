import { createContext } from "react";

export interface AppContextValue {
  wsConnected: boolean;
  setWsConnected: (v: boolean) => void;
  unconfirmedCount: number;
  setUnconfirmedCount: (v: number) => void;
}

export const AppContext = createContext<AppContextValue>({
  wsConnected: false,
  setWsConnected: () => {},
  unconfirmedCount: 0,
  setUnconfirmedCount: () => {},
});
