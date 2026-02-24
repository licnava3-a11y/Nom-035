import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface CompetencyData {
  competencyName: string;
  currentLevel: number; // 1-4 (Básico, Intermedio, Avanzado, Experto)
  requiredLevel: number; // 1-4
}

interface RadarChartProps {
  data: CompetencyData[];
  employeeName?: string;
  className?: string;
}

export default function RadarChart({ data, employeeName, className = '' }: RadarChartProps) {
  const chartRef = useRef<ChartJS<'radar'>>(null);

  const chartData = {
    labels: data.map(d => d.competencyName),
    datasets: [
      {
        label: 'Nivel Actual',
        data: data.map(d => d.currentLevel),
        backgroundColor: 'rgba(34, 197, 94, 0.2)', // green-500 with opacity
        borderColor: 'rgb(34, 197, 94)', // green-500
        borderWidth: 2,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(34, 197, 94)',
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Nivel Requerido',
        data: data.map(d => d.requiredLevel),
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 with opacity
        borderColor: 'rgb(59, 130, 246)', // blue-500
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointRadius: 4,
        pointHoverRadius: 6,
        borderDash: [5, 5], // Línea punteada para diferenciar
      },
    ],
  };

  const options: ChartOptions<'radar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        min: 0,
        max: 4,
        ticks: {
          stepSize: 1,
          callback: function(value) {
            const labels = ['', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];
            return labels[value as number] || value;
          },
          font: {
            size: 11,
          },
        },
        pointLabels: {
          font: {
            size: 12,
            weight: '500',
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 15,
          font: {
            size: 13,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function(context) {
            const labels = ['Sin evaluar', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];
            const value = context.parsed.r;
            const levelName = labels[value] || value;
            return `${context.dataset.label}: ${levelName} (${value})`;
          },
          afterLabel: function(context) {
            const dataIndex = context.dataIndex;
            const currentLevel = data[dataIndex].currentLevel;
            const requiredLevel = data[dataIndex].requiredLevel;
            const gap = requiredLevel - currentLevel;
            
            if (gap > 0) {
              return `⚠️ Brecha: ${gap} nivel${gap > 1 ? 'es' : ''}`;
            } else if (gap < 0) {
              return `✅ Supera requerimiento por ${Math.abs(gap)} nivel${Math.abs(gap) > 1 ? 'es' : ''}`;
            } else {
              return '✅ Cumple requerimiento';
            }
          },
        },
      },
    },
  };

  return (
    <div className={`${className}`}>
      {employeeName && (
        <h3 className="text-lg font-semibold text-center mb-4">
          Competencias de {employeeName}
        </h3>
      )}
      <div className="h-[400px]">
        <Radar ref={chartRef} data={chartData} options={options} />
      </div>
      <div className="mt-4 text-sm text-muted-foreground text-center">
        <p className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
            Nivel Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-500" style={{ width: '20px', borderTop: '2px dashed rgb(59, 130, 246)' }}></span>
            Nivel Requerido
          </span>
        </p>
      </div>
    </div>
  );
}
