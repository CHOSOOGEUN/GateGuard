import { Search, ChevronDown } from "lucide-react";
import { EVENT_TYPE_OPTIONS } from "@/constants/eventTypes";
import { DEFAULT_FILTERS, type EventFilters } from "./eventFiltersConfig";

interface EventsFilterProps {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  cameraOptions: { id: number; label: string }[];
  stationOptions: string[];
}

const PERIOD_OPTIONS = [
  { value: "all", label: "전체 기간" },
  { value: "today", label: "오늘" },
  { value: "week", label: "이번 주" },
  { value: "month", label: "이번 달" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "pending", label: "미확인" },
  { value: "confirmed", label: "처리완료" },
  { value: "false_alarm", label: "오탐" },
];

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative shrink-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full pl-4 pr-8 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B73F7] cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function EventsFilter({
  filters,
  onChange,
  cameraOptions,
  stationOptions,
}: EventsFilterProps) {
  const update = (partial: Partial<EventFilters>) =>
    onChange({ ...filters, ...partial });

  const cameraSelectOptions = [
    { value: "", label: "전체 카메라" },
    ...cameraOptions.map((c) => ({ value: String(c.id), label: c.label })),
  ];

  const stationSelectOptions = [
    { value: "", label: "전체 역" },
    ...stationOptions.map((s) => ({ value: s, label: s })),
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* 텍스트 검색 */}
      <div className="relative w-full sm:w-72 shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="EV-번호, 역이름, 게이트, CAM-번호 검색..."
          className="w-full pl-9 pr-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7]"
        />
      </div>

      {/* 기간 */}
      <FilterSelect
        value={filters.period}
        onChange={(v) => update({ period: v as EventFilters["period"] })}
        options={PERIOD_OPTIONS}
      />

      {/* 감지유형 */}
      <FilterSelect
        value={filters.type}
        onChange={(v) => update({ type: v })}
        options={EVENT_TYPE_OPTIONS}
      />

      {/* 카메라 */}
      <FilterSelect
        value={filters.cameraId}
        onChange={(v) => update({ cameraId: v })}
        options={cameraSelectOptions}
      />

      {/* 상태 */}
      <FilterSelect
        value={filters.status}
        onChange={(v) => update({ status: v })}
        options={STATUS_OPTIONS}
      />

      {/* 역 */}
      <FilterSelect
        value={filters.station}
        onChange={(v) => update({ station: v })}
        options={stationSelectOptions}
      />

      {/* 필터 초기화 */}
      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="px-5 py-2 rounded-full bg-[#4B73F7] text-white text-sm font-semibold hover:bg-[#3a62e6] transition shrink-0"
      >
        초기화
      </button>
    </div>
  );
}
