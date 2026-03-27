import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface BarChartProps {
  data: {
    departmentName: string;
    averageLevel: number;
    requiredLevel: number;
  }[];
  competencyName: string;
  className?: string;
}

export function BarChart({ data, competencyName, className }: BarChartProps) {
  const chartRef = useRef<ChartJS<"bar">>(null);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, []);

  const chartData = {
    labels: data.map((d: any) => d.departmentName),
    datasets: [
      {
        label: "Nivel Actual",
        data: data.map((d: any) => d.averageLevel),
        backgroundColor: data.map((d: any) =>
          d.averageLevel >= d.requiredLevel
            ? "rgba(34, 197, 94, 0.8)" // Verde si cumple
            : "rgba(239, 68, 68, 0.8)" // Rojo si no cumple
        ),
        borderColor: data.map((d: any) =>
          d.averageLevel >= d.requiredLevel
            ? "rgba(34, 197, 94, 1)"
            : "rgba(239, 68, 68, 1)"
        ),
        borderWidth: 2,
      },
      {
        label: "Nivel Requerido",
        data: data.map((d: any) => d.requiredLevel),
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
        borderDash: [5, 5],
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: {
            size: 14,
            family: "'Inter', sans-serif",
          },
          padding: 15,
        },
      },
      title: {
        display: true,
        text: `Comparativa Departamental: ${competencyName}`,
        font: {
          size: 18,
          weight: "bold",
          family: "'Inter', sans-serif",
        },
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        padding: 12,
        callbacks: {
          label: function (context) {
            const label = context.dataset.label || "";
            const value = (((context.parsed.y ?? 0) ?? 0) ?? 0).toFixed(1);
            return `${label}: ${value}`;
          },
          afterLabel: function (context) {
            if (context.datasetIndex === 0) {
              const departmentData = data[context.dataIndex];
              const gap = departmentData.requiredLevel - departmentData.averageLevel;
              if (gap > 0) {
                return `⚠️ Brecha: ${gap.toFixed(1)} puntos`;
              } else if (gap === 0) {
                return `✅ Cumple exactamente`;
              } else {
                return `✅ Supera por ${Math.abs(gap).toFixed(1)} puntos`;
              }
            }
            return "";
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
          font: {
            size: 12,
          },
          callback: function (value) {
            const labels = ["", "Básico", "Intermedio", "Avanzado", "Experto"];
            return labels[value as number] || value;
          },
        },
        title: {
          display: true,
          text: "Nivel de Competencia",
          font: {
            size: 14,
            weight: "bold",
          },
        },
      },
      x: {
        ticks: {
          font: {
            size: 12,
          },
        },
        title: {
          display: true,
          text: "Departamentos",
          font: {
            size: 14,
            weight: "bold",
          },
        },
      },
    },
  };

  return (
    <div className={className} style={{ height: "400px" }}>
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
