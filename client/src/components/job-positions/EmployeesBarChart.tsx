import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { DeferredChartFrame } from "@/components/charts/DeferredChartFrame";

export type BarChartHandle = { downloadPng: () => void };

type ChartPosition = {
  title: string;
  employees: number;
  riskLevel: string;
};

const riskColors: Record<string, string> = {
  muy_alto: "#991b1b",
  alto: "#dc2626",
  medio: "#d97706",
  bajo: "#16a34a",
};

export const EmployeesBarChart = forwardRef<BarChartHandle, { positions: ChartPosition[] }>(
  function EmployeesBarChart({ positions }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartInst = useRef<{ destroy: () => void } | null>(null);
    const [chartReady, setChartReady] = useState(false);

    useImperativeHandle(ref, () => ({
      downloadPng() {
        if (!canvasRef.current || !chartReady) return;
        const link = document.createElement("a");
        link.download = `distribucion-empleados-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
      },
    }), [chartReady]);

    useEffect(() => {
      let active = true;
      setChartReady(false);
      chartInst.current?.destroy();
      const loadChart = async () => {
        const { default: Chart } = await import("chart.js/auto");
        if (!active || !canvasRef.current) return;
        const sorted = [...positions].sort((a, b) => b.employees - a.employees).slice(0, 15);
        chartInst.current = new Chart(canvasRef.current, {
          type: "bar",
          data: { labels: sorted.map((position) => position.title.length > 28 ? `${position.title.slice(0, 26)}…` : position.title), datasets: [{ label: "Empleados asignados", data: sorted.map((position) => position.employees), backgroundColor: sorted.map((position) => riskColors[position.riskLevel] ?? "#3b82f6"), borderRadius: 4, borderSkipped: false }] },
          options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => ` ${context.parsed.x} empleado${context.parsed.x !== 1 ? "s" : ""}`, afterLabel: (context) => { const position = sorted[context.dataIndex]; return `Riesgo: ${position.riskLevel.charAt(0).toUpperCase()}${position.riskLevel.slice(1)}`; } } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(0,0,0,0.06)" } }, y: { ticks: { font: { size: 12 } }, grid: { display: false } } } },
        });
        setChartReady(true);
      };
      void loadChart();
      return () => { active = false; chartInst.current?.destroy(); };
    }, [positions]);

    const chartHeight = Math.max(180, Math.min(positions.length, 15) * 36 + 40);
    return <DeferredChartFrame loading={!chartReady} type="bar" heightClass="h-64"><div style={{ height: chartHeight }}><canvas ref={canvasRef} /></div></DeferredChartFrame>;
  },
);
