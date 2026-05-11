import ReactECharts from "echarts-for-react";

interface Props {
  data: Record<string, number>;
}

export default function DailyTrendChart({ data }: Props) {
  const dates = Object.keys(data);
  const counts = Object.values(data);

  const option = {
    grid: { top: 16, right: 8, bottom: 28, left: 32 },
    xAxis: {
      type: "category",
      data: dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: "#9ca3af", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      axisLabel: { color: "#9ca3af", fontSize: 11 },
    },
    series: [
      {
        type: "line",
        data: counts,
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#4B73F7", width: 2 },
        areaStyle: {
          color: {
            type: "linear",
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(75,115,247,0.18)" },
              { offset: 1, color: "rgba(75,115,247,0)" },
            ],
          },
        },
      },
    ],
    tooltip: {
      trigger: "axis",
      formatter: (params: { name: string; value: number }[]) =>
        `${params[0].name}: ${params[0].value}건`,
    },
  };

  return <ReactECharts option={option} style={{ height: "200px" }} />;
}
