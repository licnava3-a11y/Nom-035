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
  const [yoyMetric, setYoyMetric] = useState<'rotation' | 'growth' | 'distribution'>('growth');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // Query de departamentos para el filtro
  const { data: departmentsData } = trpc.departments.list.useQuery({ isActive: true });

  // Queries
  const { data: rotationData, isLoading: rotationLoading } = trpc.departmentMetrics.getRotationMetrics.useQuery({
    period: rotationPeriod,
  });

  const { data: growthData, isLoading: growthLoading } = trpc.departmentMetrics.getGrowthMetrics.useQuery({
    months: growthMonths,
  });

  const { data: distributionData, isLoading: distributionLoading } = trpc.departmentMetrics.getDistributionMetrics.useQuery();

  const { data: yoyData, isLoading: yoyLoading } = trpc.departmentMetrics.getYearOverYearComparison.useQuery({
    metric: yoyMetric,
  });

  const { data: predictiveAlerts, isLoading: predictiveAlertsLoading } = trpc.departments.getPredictiveTurnoverAlerts.useQuery({
    status: 'active',
    minRiskScore: 40,
  });

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Departamentos</h1>
          <p className="text-muted-foreground mt-2">
            Estadísticas de rotación, crecimiento y distribución de empleados por departamento
          </p>
        </div>
        <div className="w-64">
          <Select
            value={selectedDepartmentId?.toString() || 'all'}
            onValueChange={(value) => setSelectedDepartmentId(value === 'all' ? null : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departmentsData?.departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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

      {/* Gráfico de Comparación Año contra Año */}
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comparativa Año contra Año</CardTitle>
              <CardDescription>
                Comparación de métricas del año actual vs año anterior
              </CardDescription>
            </div>
            <Select value={yoyMetric} onValueChange={(value: 'rotation' | 'growth' | 'distribution') => setYoyMetric(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rotation">Rotación</SelectItem>
                <SelectItem value="growth">Crecimiento</SelectItem>
                <SelectItem value="distribution">Distribución</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {yoyLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {yoyMetric === 'growth' && yoyData?.metric === 'growth' && (
                <div>
                  <div className="h-64">
                    <Bar
                      data={{
                        labels: yoyData.comparison.map((c) => c.departmentName),
                        datasets: [
                          {
                            label: `${yoyData.currentYear}`,
                            data: yoyData.comparison.map((c) => c.currentYear?.employeeCount || 0),
                            backgroundColor: 'rgba(34, 197, 94, 0.7)',
                            borderColor: 'rgb(34, 197, 94)',
                            borderWidth: 1,
                          },
                          {
                            label: `${yoyData.lastYear}`,
                            data: yoyData.comparison.map((c) => c.lastYear?.employeeCount || 0),
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 1,
                          },
                        ],
                      }}
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
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold mb-4">Cambios Porcentuales</h4>
                    {yoyData.comparison.map((c, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                        <span className="text-sm">{c.departmentName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {c.currentYear?.employeeCount || 0} → {c.lastYear?.employeeCount || 0}
                          </span>
                          <span
                            className={`text-sm font-medium ${
                              parseFloat(c.growthChange) > 0
                                ? 'text-green-600'
                                : parseFloat(c.growthChange) < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {parseFloat(c.growthChange) > 0 ? '↑' : parseFloat(c.growthChange) < 0 ? '↓' : '→'}{' '}
                            {Math.abs(parseFloat(c.growthChange))}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {yoyMetric === 'rotation' && yoyData?.metric === 'rotation' && (
                <div>
                  <div className="h-64">
                    <Line
                      data={{
                        labels: yoyData.comparison.map((c) => c.departmentName),
                        datasets: [
                          {
                            label: `Altas ${yoyData.currentYear}`,
                            data: yoyData.comparison.map((c) => c.currentYear?.hires || 0),
                            borderColor: 'rgb(34, 197, 94)',
                            backgroundColor: 'rgba(34, 197, 94, 0.1)',
                            tension: 0.4,
                          },
                          {
                            label: `Altas ${yoyData.lastYear}`,
                            data: yoyData.comparison.map((c) => c.lastYear?.hires || 0),
                            borderColor: 'rgb(59, 130, 246)',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            borderDash: [5, 5],
                          },
                          {
                            label: `Bajas ${yoyData.currentYear}`,
                            data: yoyData.comparison.map((c) => c.currentYear?.terminations || 0),
                            borderColor: 'rgb(239, 68, 68)',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                          },
                          {
                            label: `Bajas ${yoyData.lastYear}`,
                            data: yoyData.comparison.map((c) => c.lastYear?.terminations || 0),
                            borderColor: 'rgb(249, 115, 22)',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            tension: 0.4,
                            borderDash: [5, 5],
                          },
                        ],
                      }}
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
                          },
                        },
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold mb-4">Cambios Porcentuales</h4>
                    {yoyData.comparison.map((c, index) => (
                      <div key={index} className="space-y-1 p-2 hover:bg-accent rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{c.departmentName}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Altas:</span>
                          <span
                            className={`font-medium ${
                              parseFloat(c.hiresChange) > 0
                                ? 'text-green-600'
                                : parseFloat(c.hiresChange) < 0
                                ? 'text-red-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {parseFloat(c.hiresChange) > 0 ? '↑' : parseFloat(c.hiresChange) < 0 ? '↓' : '→'}{' '}
                            {Math.abs(parseFloat(c.hiresChange))}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span>Bajas:</span>
                          <span
                            className={`font-medium ${
                              parseFloat(c.terminationsChange) > 0
                                ? 'text-red-600'
                                : parseFloat(c.terminationsChange) < 0
                                ? 'text-green-600'
                                : 'text-gray-600'
                            }`}
                          >
                            {parseFloat(c.terminationsChange) > 0 ? '↑' : parseFloat(c.terminationsChange) < 0 ? '↓' : '→'}{' '}
                            {Math.abs(parseFloat(c.terminationsChange))}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {yoyMetric === 'distribution' && yoyData?.metric === 'distribution' && (
                <div>
                  <div className="h-64">
                    <Pie
                      data={{
                        labels: yoyData.comparison.map((c) => c.departmentName),
                        datasets: [
                          {
                            data: yoyData.comparison.map((c) => c.employeeCount),
                            backgroundColor: [
                              'rgba(34, 197, 94, 0.7)',
                              'rgba(59, 130, 246, 0.7)',
                              'rgba(239, 68, 68, 0.7)',
                              'rgba(249, 115, 22, 0.7)',
                              'rgba(168, 85, 247, 0.7)',
                              'rgba(236, 72, 153, 0.7)',
                            ],
                            borderColor: [
                              'rgb(34, 197, 94)',
                              'rgb(59, 130, 246)',
                              'rgb(239, 68, 68)',
                              'rgb(249, 115, 22)',
                              'rgb(168, 85, 247)',
                              'rgb(236, 72, 153)',
                            ],
                            borderWidth: 1,
                          },
                        ],
                      }}
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
                  <div className="mt-4 space-y-2">
                    <h4 className="font-semibold mb-4">Distribución Actual ({yoyData.currentYear})</h4>
                    {yoyData.comparison.map((c, index) => (
                      <div key={index} className="flex items-center justify-between p-2 hover:bg-accent rounded">
                        <span className="text-sm">{c.departmentName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{c.employeeCount} empleados</span>
                          <span className="text-xs text-muted-foreground">({c.percentage}%)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas Predictivas de Rotación */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Alertas Predictivas de Rotación</CardTitle>
          <CardDescription>
            Departamentos con alto riesgo de rotación basado en análisis predictivo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predictiveAlertsLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : predictiveAlerts && predictiveAlerts.alerts.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{predictiveAlerts.highRiskCount}</div>
                  <div className="text-sm text-red-700">Riesgo Alto (≥70)</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{predictiveAlerts.mediumRiskCount}</div>
                  <div className="text-sm text-yellow-700">Riesgo Medio (40-69)</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{predictiveAlerts.totalAlerts}</div>
                  <div className="text-sm text-blue-700">Total Alertas</div>
                </div>
              </div>

              <div className="space-y-3">
                {predictiveAlerts.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.riskScore >= 70
                        ? 'bg-red-50 border-red-500'
                        : alert.riskScore >= 40
                        ? 'bg-yellow-50 border-yellow-500'
                        : 'bg-green-50 border-green-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-lg">{alert.departmentName}</h4>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              alert.riskScore >= 70
                                ? 'bg-red-100 text-red-700'
                                : alert.riskScore >= 40
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-green-100 text-green-700'
                            }`}
                          >
                            Score: {alert.riskScore}/100
                          </span>
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Empleados:</span>
                            <span className="ml-2 font-medium">{alert.currentEmployeeCount}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Altas (3m):</span>
                            <span className="ml-2 font-medium text-green-600">{alert.hiresLast3Months}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Bajas (3m):</span>
                            <span className="ml-2 font-medium text-red-600">{alert.terminationsLast3Months}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Rotación Pred.:</span>
                            <span className="ml-2 font-medium">{alert.predictedTurnoverRate}%</span>
                          </div>
                        </div>

                        {alert.recommendedActions && alert.recommendedActions.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium mb-2">Acciones Recomendadas:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                              {alert.recommendedActions.map((action: string, index: number) => (
                                <li key={index}>{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 text-xs text-muted-foreground">
                      Analizado: {new Date(alert.analyzedAt).toLocaleDateString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No se detectaron departamentos con alto riesgo de rotación</p>
              <p className="text-sm mt-2">El análisis predictivo se ejecuta mensualmente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
