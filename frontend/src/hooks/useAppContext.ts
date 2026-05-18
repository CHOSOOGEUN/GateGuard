import { useContext } from "react";
import { AppContext } from "@/contexts/appContextDef";

export const useAppContext = () => useContext(AppContext);
