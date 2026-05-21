export interface EventFilters {
  search: string;
  period: "all" | "today" | "week" | "month";
  type: string;
  cameraId: string;
  status: string;
  station: string;
}

export const DEFAULT_FILTERS: EventFilters = {
  search: "",
  period: "all",
  type: "",
  cameraId: "",
  status: "",
  station: "",
};
