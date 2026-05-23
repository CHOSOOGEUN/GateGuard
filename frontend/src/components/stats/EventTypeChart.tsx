import ReactECharts from "echarts-for-react";

interface Props {
  data: Record<string, number>;
}

const COLORS = ["#4B73F7", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#6b7280"];

export default function EventTypeChart({ data }: Props) {
  const total = Object.values(data).reduce((s, v) => s + v, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-sm text-gray-400">
        데이터 없음
      </div>
    );
  }

  const seriesData = Object.entries(data).map(([name, value], i) => ({
    name,
    value,
    itemStyle: { color: COLORS[i % COLORS.length] },
  }));

  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c}건 ({d}%)",
    },
    legend: {
      orient: "vertical",
      right: 0,
      top: "center",
      textStyle: { fontSize: 11, color: "#6b7280" },
      itemWidth: 10,
      itemHeight: 10,
    },
    series: [
      {
        type: "pie",
        radius: ["38%", "68%"],
        center: ["38%", "50%"],
        data: seriesData,
        label: {
          formatter: "{d}%",
          fontSize: 11,
          color: "#fff",
          position: "inside",
        },
        labelLine: { show: false },
        itemStyle: { borderRadius: 3, borderWidth: 2, borderColor: "#fff" },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: "200px" }} />;
}
