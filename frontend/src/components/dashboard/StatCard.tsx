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
    <div className="flex items-center gap-5 bg-white rounded-2xl px-6 py-5 flex-1 shadow-sm">
      <span
        className={`text-4xl font-bold ${color} ${bg} w-16 h-16 rounded-full flex items-center justify-center shrink-0`}
      >
        {count}
      </span>
      <div>
        <p className="text-lg font-bold text-gray-900">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
