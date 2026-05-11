import ReactECharts from "echarts-for-react";

interface Props {
  data: Record<string, number>;
}

const SLOTS = [
  "00-02","02-04","04-06","06-08","08-10","10-12",
  "12-14","14-16","16-18","18-20","20-22","22-24",
];

function slotColor(count: number) {
  if (count >= 25) return "#ef4444";
  if (count >= 15) return "#f59e0b";
  return "#4B73F7";
}

export default function HourlyDistributionChart({ data }: Props) {
  const slots = [...SLOTS].reverse();
  const counts = slots.map((s) => data[s] ?? 0);

  const option = {
    grid: { top: 4, right: 48, bottom: 4, left: 8, containLabel: true },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: slots,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: counts.map((v) => ({
          value: v,
          itemStyle: { color: slotColor(v), borderRadius: [0, 3, 3, 0] },
        })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: "right",
          color: "#6b7280",
          fontSize: 11,
          formatter: "{c}건",
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}시: ${params[0].value}건`,
    },
  };

  return <ReactECharts option={option} style={{ height: "300px" }} />;
}
