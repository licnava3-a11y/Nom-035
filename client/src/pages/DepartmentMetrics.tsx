import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Users, BarChart3 } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DepartmentMetrics() {
  const [rotationPeriod, setRotationPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [growthMonths, setGrowthMonths] = useState(6);

  // Queries
  const { data: rotationData, isLoading: rotationLoading } = trpc.departmentMetrics.getRotationMetrics.useQuery({
    period: rotationPeriod,
  });

  const { data: growthData, isLoading: growthLoading } = trpc.departmentMetrics.getGrowthMetrics.useQuery({
    months: growthMonths,
  });

  const { data: distributionData, isLoading: distributionLoading } = trpc.departmentMetrics.getDistributionMetrics.useQuery();

  // Configuración de gráfico de rotación (Line Chart)
  const rotationChartData = {
    labels: rotationData?.metrics.map((m) => m.departmentName) || [],
    datasets: [
      {
        label: 'Altas',
        data: rotationData?.metrics.map((m) => m.hires) || [],
        borderColor: 'rgb(34, 197, 94)', // Verde
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Bajas',
        data: rotationData?.metrics.map((m) => m.terminations) || [],
        borderColor: 'rgb(239, 68, 68)', // Rojo
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.3,
      },
      {
        label: 'Cambio Neto',
        data: rotationData?.metrics.map((m) => m.netChange) || [],
        borderColor: 'rgb(59, 130, 246)', // Azul
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.3,
      },
    ],
  };

  // Configuración de gráfico de crecimiento (Bar Chart)
  const growthChartData = {
    labels: growthData?.months || [],
    datasets: growthData?.departments.slice(0, 5).map((dept, index) => {
      const colors = [
        'rgb(34, 197, 94)', // Verde
        'rgb(59, 130, 246)', // Azul
        'rgb(239, 68, 68)', // Rojo
        'rgb(168, 85, 247)', // Púrpura
        'rgb(251, 146, 60)', // Naranja
      ];
      return {
        label: dept.name,
        data: dept.data,
        backgroundColor: colors[index % colors.length],
      };
    }) || [],
  };

  // Configuración de gráfico de distribución (Pie Chart)
  const distributionChartData = {
    labels: distributionData?.distribution.map((d) => d.departmentName || 'Sin departamento') || [],
    datasets: [
      {
        data: distributionData?.distribution.map((d) => d.employeeCount) || [],
        backgroundColor: [
          'rgb(34, 197, 94)', // Verde
          'rgb(59, 130, 246)', // Azul
          'rgb(239, 68, 68)', // Rojo
          'rgb(168, 85, 247)', // Púrpura
          'rgb(251, 146, 60)', // Naranja
          'rgb(14, 165, 233)', // Cyan
          'rgb(236, 72, 153)', // Rosa
          'rgb(132, 204, 22)', // Lima
        ],
      },
    ],
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Métricas de Departamentos</h1>
        <p className="text-muted-foreground mt-2">
          Estadísticas de rotación, crecimiento y distribución de empleados por departamento
        </p>
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {distributionLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                distributionData?.totalEmployees || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Distribuidos en {distributionData?.departmentCount || 0} departamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Altas del Período</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rotationLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                rotationData?.totalHires || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Nuevos empleados en el período seleccionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajas del Período</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rotationLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                rotationData?.totalTerminations || 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Empleados que salieron en el período
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Rotación */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rotación de Personal por Departamento</CardTitle>
              <CardDescription>Altas, bajas y cambio neto en el período seleccionado</CardDescription>
            </div>
            <Select value={rotationPeriod} onValueChange={(value: any) => setRotationPeriod(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este año</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {rotationLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[400px]">
              <Line
                data={rotationChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Crecimiento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Crecimiento de Empleados por Departamento</CardTitle>
              <CardDescription>Evolución mensual de los principales departamentos</CardDescription>
            </div>
            <Select value={growthMonths.toString()} onValueChange={(value) => setGrowthMonths(parseInt(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Últimos 3 meses</SelectItem>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {growthLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[400px]">
              <Bar
                data={growthChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Distribución */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución Actual de Empleados</CardTitle>
          <CardDescription>Porcentaje de empleados por departamento</CardDescription>
        </CardHeader>
        <CardContent>
          {distributionLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              <div className="h-[400px] flex items-center justify-center">
                <Pie
                  data={distributionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'right' as const,
                      },
                    },
                  }}
                />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold mb-4">Detalle por Departamento</h4>
                {distributionData?.distribution.map((d, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                    <span className="text-sm">{d.departmentName || 'Sin departamento'}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{d.employeeCount} empleados</span>
                      <span className="text-xs text-muted-foreground">({d.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
