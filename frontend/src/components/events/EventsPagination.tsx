/**
 * @file components/events/EventsPagination.tsx
 * @description 전체 발생내역 페이지네이션 컴포넌트
 *
 * ## 기능
 * - 좌측: "총 N건 중 A-B 표시"
 * - 중앙: 이전/다음 버튼 + 페이지 번호 버튼 (7개 초과 시 슬라이딩 윈도우 + 말줄임)
 * - 우측: 페이지당 건수 선택 (8 / 16 / 32)
 *
 * ## 주의사항
 * - 클라이언트사이드 페이지네이션 기준 (EventsPage에서 filteredEvents.slice 후 전달)
 * - 서버사이드 전환 시 onPageChange / onPageSizeChange 시그니처 그대로 유지 가능
 */

import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface EventsPaginationProps {
  total: number;
  page: number; // 1-based
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [8, 16, 32];

function getPageNumbers(page: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const delta = 2;
  const left = Math.max(2, page - delta);
  const right = Math.min(totalPages - 1, page + delta);
  const middle: number[] = [];
  for (let i = left; i <= right; i++) middle.push(i);

  const result: (number | "...")[] = [1];
  if (left > 2) result.push("...");
  result.push(...middle);
  if (right < totalPages - 1) result.push("...");
  if (totalPages > 1) result.push(totalPages);
  return result;
}

export default function EventsPagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: EventsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between py-1">
      {/* 좌측: 건수 표시 */}
      <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
        총 {total}건 중 {startItem}-{endItem} 표시
      </p>

      {/* 중앙: 페이지 버튼 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition text-gray-600 dark:text-gray-400"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="sr-only">이전</span>
        </button>

        {pageNumbers.map((p, i) =>
          p === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm"
            >
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition ${
                p === page
                  ? "bg-[#4B73F7] text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition text-gray-600 dark:text-gray-400"
        >
          <ChevronRight className="w-4 h-4" />
          <span className="sr-only">다음</span>
        </button>
      </div>

      {/* 우측: 페이지당 건수 */}
      <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span>페이지당</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg pl-3 pr-6 py-1 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-[#4B73F7] cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <span>건</span>
      </div>
    </div>
  );
}
