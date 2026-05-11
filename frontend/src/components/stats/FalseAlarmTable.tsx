interface Props {
  data: Record<string, number>;
}

export default function FalseAlarmTable({ data }: Props) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">오탐 신고 없음</p>
    );
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-400 text-xs border-b border-gray-100">
          <th className="pb-2 text-left font-medium">오탐사유</th>
          <th className="pb-2 text-right font-medium">건수</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([reason, count]) => (
          <tr key={reason} className="border-b border-gray-50 last:border-0">
            <td className="py-2.5 text-gray-700">{reason}</td>
            <td className="py-2.5 text-right text-gray-600">{count}건</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
