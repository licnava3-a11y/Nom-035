import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TimelineDataPoint {
  cycleName: string;
  cycleDate: string;
  competencyLevel: number;
}

interface TimelineChartProps {
  data: TimelineDataPoint[];
  competencyName: string;
  employeeName?: string;
  className?: string;
}

export default function TimelineChart({
  data,
  competencyName,
  employeeName,
  className = "",
}: TimelineChartProps) {
  const chartRef = useRef<ChartJS<"line">>(null);

  // Ordenar datos por fecha
  const sortedData = [...data].sort(
    (a, b) => new Date(a.cycleDate).getTime() - new Date(b.cycleDate).getTime()
  );

  // Calcular tendencia (ascendente, descendente, estable)
  const getTrend = () => {
    if (sortedData.length < 2) return "stable";
    const firstLevel = sortedData[0].competencyLevel;
    const lastLevel = sortedData[sortedData.length - 1].competencyLevel;
    const diff = lastLevel - firstLevel;
    if (diff > 0.5) return "ascending";
    if (diff < -0.5) return "descending";
    return "stable";
  };

  const trend = getTrend();

  // Color según tendencia
  const lineColor =
    trend === "ascending"
      ? "rgb(34, 197, 94)" // green-500
      : trend === "descending"
      ? "rgb(239, 68, 68)" // red-500
      : "rgb(156, 163, 175)"; // gray-400

  const chartData = {
    labels: sortedData.map((d) => d.cycleName),
    datasets: [
      {
        label: competencyName,
        data: sortedData.map((d) => d.competencyLevel),
        borderColor: lineColor,
        backgroundColor: lineColor.replace("rgb", "rgba").replace(")", ", 0.1)"),
        borderWidth: 3,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: lineColor,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      title: {
        display: true,
        text: employeeName
          ? `Evolución de ${competencyName} - ${employeeName}`
          : `Evolución de ${competencyName}`,
        font: {
          size: 16,
          weight: "bold" as const,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const dataPoint = sortedData[context.dataIndex];
            const level = context.parsed.y;
            const levelLabel =
              level >= 4
                ? "Experto"
                : level >= 3
                ? "Avanzado"
                : level >= 2
                ? "Intermedio"
                : "Básico";
            return [
              `Nivel: ${level.toFixed(1)} (${levelLabel})`,
              `Ciclo: ${dataPoint.cycleName}`,
              `Fecha: ${new Date(dataPoint.cycleDate).toLocaleDateString("es-MX")}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 4,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            const labels = ["", "Básico", "Intermedio", "Avanzado", "Experto"];
            return labels[value] || value;
          },
        },
        title: {
          display: true,
          text: "Nivel de Competencia",
        },
      },
      x: {
        title: {
          display: true,
          text: "Ciclo de Evaluación",
        },
      },
    },
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="h-[400px]">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Tendencia Ascendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-muted-foreground">Tendencia Descendente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gray-400"></div>
            <span className="text-muted-foreground">Tendencia Estable</span>
          </div>
        </div>
        <div className="text-muted-foreground">
          {sortedData.length} evaluaciones registradas
        </div>
      </div>
    </div>
  );
}
