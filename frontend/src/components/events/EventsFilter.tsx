/**
 * @file components/events/EventsFilter.tsx
 * @description 전체 발생내역 필터 바 컴포넌트
 *
 * ## 기능
 * - 텍스트 검색: 역이름 / 게이트이름 / 인상착의 대상 클라이언트사이드 필터링
 * - 기간 드롭다운: 전체 / 오늘 / 이번 주 / 이번 달
 * - 유형 드롭다운: event_type 또는 description 기반 필터링
 * - 카메라 드롭다운: 로드된 이벤트에서 추출한 CAM-XX 목록
 * - 상태 드롭다운: 미확인 / 처리완료 / 오탐
 * - 역 드롭다운: 로드된 이벤트에서 추출한 역이름 목록
 * - 전체 버튼: 모든 필터 초기화
 *
 * ## 주의사항
 * - cameraOptions, stationOptions는 EventsPage에서 allEvents 기반으로 추출해서 전달
 * - 유형 필터는 event_type 필드가 없으면 description으로 fallback
 *
 * ## TODO
 * - [ ] 기간 필터 직접 선택(날짜 picker) 기능 추가
 * - [ ] 감지유형 목록 백엔드 스펙 확정 후 수정
 */

import { Search, ChevronDown } from "lucide-react";

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

const TYPE_OPTIONS = [
  { value: "", label: "전체 유형" },
  { value: "태그 없이 통행", label: "태그 없이 통행" },
  { value: "테일게이팅", label: "테일게이팅" },
  { value: "비상문 강제 진입", label: "비상문 강제 진입" },
  { value: "역방향 진입", label: "역방향 진입" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "detected", label: "미확인" },
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
        className="appearance-none bg-white border border-gray-200 rounded-full pl-4 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4B73F7] cursor-pointer"
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
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          placeholder="역이름, 게이트이름, 인상착의 검색..."
          className="pl-9 pr-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4B73F7] w-72"
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
        options={TYPE_OPTIONS}
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

      {/* 전체 리셋 */}
      <button
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="px-5 py-2 rounded-full bg-[#4B73F7] text-white text-sm font-semibold hover:bg-[#3a62e6] transition shrink-0"
      >
        전체
      </button>
    </div>
  );
}
