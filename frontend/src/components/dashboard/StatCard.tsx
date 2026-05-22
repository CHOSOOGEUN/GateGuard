/** 통계 카드 단일 컴포넌트 (StatCards.tsx에서 사용) */

interface StatCardProps {
  count: number;
  label: string;
  sub: string;
  color: string; // tailwind text color class
  bg: string; // tailwind bg color class
}

export default function StatCard({
  count,
  label,
  sub,
  color,
  bg,
}: StatCardProps) {
  return (
    <div className="flex items-center justify-center lg:justify-start gap-4 bg-white dark:bg-gray-800 rounded-2xl px-3 lg:px-6 py-4 lg:py-5 flex-1 shadow-sm">
      <span
        className={`text-2xl lg:text-4xl font-bold ${color} ${bg} w-12 h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shrink-0`}
      >
        {count}
      </span>
      <div className="hidden lg:block">
        <p className="text-lg font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
