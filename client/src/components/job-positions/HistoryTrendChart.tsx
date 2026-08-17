import { useEffect, useRef, useState } from "react";
import { DeferredChartFrame } from "@/components/charts/DeferredChartFrame";

type HistoryPoint = {
  analyzedAt: Date | string;
  riskIndex: number | string;
};

export function HistoryTrendChart({ data }: { data: HistoryPoint[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<{ destroy: () => void } | null>(null);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (data.length < 2) return;
    let active = true;
    setChartReady(false);
    chartInst.current?.destroy();
    const loadChart = async () => {
      const { default: Chart } = await import("chart.js/auto");
      if (!active || !canvasRef.current) return;
      const sorted = [...data].sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime());
      const labels = sorted.map((record) => new Date(record.analyzedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }));
      const values = sorted.map((record) => Number(record.riskIndex));
      const pointColors = values.map((value) => value >= 3.5 ? "#dc2626" : value >= 2.5 ? "#d97706" : "#16a34a");
      chartInst.current = new Chart(canvasRef.current, { type: "line", data: { labels, datasets: [{ label: "Índice de Riesgo", data: values, borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", pointBackgroundColor: pointColors, pointBorderColor: pointColors, pointRadius: 5, pointHoverRadius: 7, tension: 0.3, fill: true }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` Índice: ${context.parsed.y}/5` } } }, scales: { y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.06)" } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } } });
      setChartReady(true);
    };
    void loadChart();
    return () => { active = false; chartInst.current?.destroy(); };
  }, [data]);

  return <DeferredChartFrame loading={!chartReady} type="line" heightClass="h-36"><div style={{ height: 140 }}><canvas ref={canvasRef} /></div></DeferredChartFrame>;
}
