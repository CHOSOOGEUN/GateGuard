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
