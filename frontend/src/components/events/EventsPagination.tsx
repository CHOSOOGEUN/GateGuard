import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface EventsPaginationProps {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  totalPages?: number; // PR #31 — X-Total-Count 기반. 있으면 "page/total" 표시
  total?: number;       // 전체 건수
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [8, 16, 32];

export default function EventsPagination({
  page,
  pageSize,
  hasNextPage,
  totalPages,
  total,
  onPageChange,
  onPageSizeChange,
}: EventsPaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0 sm:justify-between py-1">
      <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
        {totalPages != null
          ? `${page} / ${totalPages} 페이지${total != null ? ` (총 ${total.toLocaleString()}건)` : ""}`
          : `${page}페이지`}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          이전
        </button>
        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#4B73F7] text-white text-sm font-medium">
          {page}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
        >
          다음
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <span>페이지당</span>
        <div className="relative">
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
