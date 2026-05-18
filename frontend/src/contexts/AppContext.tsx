import { useState } from "react";
import type { ReactNode } from "react";
import { AppContext } from "./appContextDef";

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
