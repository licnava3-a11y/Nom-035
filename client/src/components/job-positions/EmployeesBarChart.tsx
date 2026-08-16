import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Chart from "chart.js/auto";

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
    const chartInst = useRef<Chart | null>(null);

    useImperativeHandle(ref, () => ({
      downloadPng() {
        if (!canvasRef.current) return;
        const link = document.createElement("a");
        link.download = `distribucion-empleados-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvasRef.current.toDataURL("image/png");
        link.click();
      },
    }));

    useEffect(() => {
      if (!canvasRef.current) return;
      chartInst.current?.destroy();
      const sorted = [...positions].sort((a, b) => b.employees - a.employees).slice(0, 15);
      chartInst.current = new Chart(canvasRef.current, {
        type: "bar",
        data: {
          labels: sorted.map((position) => position.title.length > 28 ? `${position.title.slice(0, 26)}…` : position.title),
          datasets: [{
            label: "Empleados asignados",
            data: sorted.map((position) => position.employees),
            backgroundColor: sorted.map((position) => riskColors[position.riskLevel] ?? "#3b82f6"),
            borderRadius: 4,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${context.parsed.x} empleado${context.parsed.x !== 1 ? "s" : ""}`,
                afterLabel: (context) => {
                  const position = sorted[context.dataIndex];
                  return `Riesgo: ${position.riskLevel.charAt(0).toUpperCase()}${position.riskLevel.slice(1)}`;
                },
              },
            },
          },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(0,0,0,0.06)" } },
            y: { ticks: { font: { size: 12 } }, grid: { display: false } },
          },
        },
      });
      return () => chartInst.current?.destroy();
    }, [positions]);

    const chartHeight = Math.max(180, Math.min(positions.length, 15) * 36 + 40);
    return <div style={{ height: chartHeight }}><canvas ref={canvasRef} /></div>;
  },
);
