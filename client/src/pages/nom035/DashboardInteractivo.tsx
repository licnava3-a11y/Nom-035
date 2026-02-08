/**
 * Dashboard Interactivo NOM-035
 * Visualización en tiempo real de riesgos psicosociales
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Users,
  BarChart3,
  Clock,
} from 'lucide-react';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DashboardInteractivoPage() {
  const [periodo, setPeriodo] = useState<'mes' | 'trimestre' | 'semestre' | 'año'>('mes');

  // Queries
  const { data: globalRisk, isLoading: loadingGlobal } = trpc.dashboardNom035.getGlobalRisk.useQuery({});
  const { data: heatmap, isLoading: loadingHeatmap } = trpc.dashboardNom035.getDimensionHeatmap.useQuery();
  const { data: trends, isLoading: loadingTrends } = trpc.dashboardNom035.getTemporalTrends.useQuery({ periodo });
  const { data: criticalCases, isLoading: loadingCases } = trpc.dashboardNom035.getCriticalCases.useQuery();
  const { data: compliance, isLoading: loadingCompliance } = trpc.dashboardNom035.getComplianceMetrics.useQuery();

  // Colores por nivel de riesgo
  const getRiskColor = (nivel: string) => {
    switch (nivel) {
      case 'muy_alto':
        return 'bg-red-600';
      case 'alto':
        return 'bg-orange-600';
      case 'medio':
        return 'bg-yellow-600';
      case 'bajo':
        return 'bg-blue-600';
      case 'nulo':
      case 'sin_datos':
        return 'bg-green-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getRiskLabel = (nivel: string) => {
    switch (nivel) {
      case 'muy_alto':
        return 'Muy Alto';
      case 'alto':
        return 'Alto';
      case 'medio':
        return 'Medio';
      case 'bajo':
        return 'Bajo';
      case 'nulo':
        return 'Nulo';
      case 'sin_datos':
        return 'Sin Datos';
      default:
        return nivel;
    }
  };

  // Datos para gráfica de distribución de riesgos
  const distributionData = globalRisk
    ? {
        labels: ['Nulo', 'Bajo', 'Medio', 'Alto', 'Muy Alto'],
        datasets: [
          {
            label: 'Distribución de Riesgos',
            data: [
              globalRisk.distribucion.nulo,
              globalRisk.distribucion.bajo,
              globalRisk.distribucion.medio,
              globalRisk.distribucion.alto,
              globalRisk.distribucion.muy_alto,
            ],
            backgroundColor: [
              'rgba(34, 197, 94, 0.8)',
              'rgba(59, 130, 246, 0.8)',
              'rgba(234, 179, 8, 0.8)',
              'rgba(249, 115, 22, 0.8)',
              'rgba(239, 68, 68, 0.8)',
            ],
          },
        ],
      }
    : null;

  // Datos para gráfica de mapa de calor
  const heatmapData = heatmap
    ? {
        labels: heatmap.dimensiones.slice(0, 10).map((d) => d.codigo),
        datasets: [
          {
            label: 'Promedio de Puntaje',
            data: heatmap.dimensiones.slice(0, 10).map((d) => d.promedio),
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
          },
        ],
      }
    : null;

  // Datos para gráfica de evolución temporal
  const trendsData = trends
    ? {
        labels: trends.trends.map((t) => t.periodo),
        datasets: [
          {
            label: 'Muy Alto',
            data: trends.trends.map((t) => t.muy_alto),
            borderColor: 'rgba(239, 68, 68, 1)',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            fill: true,
          },
          {
            label: 'Alto',
            data: trends.trends.map((t) => t.alto),
            borderColor: 'rgba(249, 115, 22, 1)',
            backgroundColor: 'rgba(249, 115, 22, 0.2)',
            fill: true,
          },
          {
            label: 'Medio',
            data: trends.trends.map((t) => t.medio),
            borderColor: 'rgba(234, 179, 8, 1)',
            backgroundColor: 'rgba(234, 179, 8, 0.2)',
            fill: true,
          },
        ],
      }
    : null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Dashboard Interactivo NOM-035
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitoreo en tiempo real de riesgos psicosociales
          </p>
        </div>
        <Select value={periodo} onValueChange={(v: any) => setPeriodo(v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Último Mes</SelectItem>
            <SelectItem value="trimestre">Último Trimestre</SelectItem>
            <SelectItem value="semestre">Último Semestre</SelectItem>
            <SelectItem value="año">Último Año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas de Cumplimiento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Empleados</p>
              <p className="text-3xl font-bold">{compliance?.totalEmployees || 0}</p>
            </div>
            <Users className="h-10 w-10 text-blue-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Evaluaciones Totales</p>
              <p className="text-3xl font-bold">{compliance?.totalEvaluations || 0}</p>
            </div>
            <BarChart3 className="h-10 w-10 text-green-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Cobertura</p>
              <p className="text-3xl font-bold">{compliance?.cobertura.toFixed(1) || 0}%</p>
            </div>
            <TrendingUp className="h-10 w-10 text-purple-600" />
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Últimos 30 Días</p>
              <p className="text-3xl font-bold">{compliance?.recentEvaluations || 0}</p>
            </div>
            <Clock className="h-10 w-10 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Semáforo de Riesgo Global */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" />
          Semáforo de Riesgo Global
        </h2>
        {loadingGlobal ? (
          <div className="text-center py-8">Cargando...</div>
        ) : globalRisk ? (
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className={`w-24 h-24 rounded-full ${getRiskColor(globalRisk.nivelRiesgo)} flex items-center justify-center`}>
                  <span className="text-white font-bold text-2xl">
                    {globalRisk.porcentajeRiesgo.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{getRiskLabel(globalRisk.nivelRiesgo)}</h3>
                  <p className="text-muted-foreground">
                    {globalRisk.totalEvaluaciones} evaluaciones analizadas
                  </p>
                </div>
              </div>
            </div>
            {distributionData && (
              <div className="w-96">
                <Doughnut
                  data={distributionData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'right',
                      },
                      title: {
                        display: true,
                        text: 'Distribución de Riesgos',
                      },
                    },
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">No hay datos disponibles</div>
        )}
      </Card>

      {/* Mapa de Calor por Dimensión */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Mapa de Calor por Dimensión</h2>
        {loadingHeatmap ? (
          <div className="text-center py-8">Cargando...</div>
        ) : heatmapData ? (
          <Bar
            data={heatmapData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  display: false,
                },
                title: {
                  display: true,
                  text: 'Top 10 Dimensiones con Mayor Puntaje Promedio',
                },
              },
              scales: {
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        ) : (
          <div className="text-center py-8">No hay datos disponibles</div>
        )}
      </Card>

      {/* Evolución Temporal */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Evolución Temporal de Riesgos</h2>
        {loadingTrends ? (
          <div className="text-center py-8">Cargando...</div>
        ) : trendsData ? (
          <Line
            data={trendsData}
            options={{
              responsive: true,
              plugins: {
                legend: {
                  position: 'top',
                },
                title: {
                  display: true,
                  text: 'Tendencia de Casos por Nivel de Riesgo',
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
        ) : (
          <div className="text-center py-8">No hay datos disponibles</div>
        )}
      </Card>

      {/* Casos Críticos */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          Casos Críticos que Requieren Atención
        </h2>
        {loadingCases ? (
          <div className="text-center py-8">Cargando...</div>
        ) : criticalCases && criticalCases.cases.length > 0 ? (
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              {criticalCases.total} casos críticos identificados
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>CURP</TableHead>
                  <TableHead>Nivel de Riesgo</TableHead>
                  <TableHead>Puntaje</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Encuesta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {criticalCases.cases.slice(0, 10).map((caso) => (
                  <TableRow key={caso.id}>
                    <TableCell>{caso.id}</TableCell>
                    <TableCell>{caso.curp}</TableCell>
                    <TableCell>
                      <Badge className={caso.nivelRiesgo === 'Muy alto' ? 'bg-red-600' : 'bg-orange-600'}>
                        {caso.nivelRiesgo}
                      </Badge>
                    </TableCell>
                    <TableCell>{caso.puntajeTotal}</TableCell>
                    <TableCell>{caso.fecha ? new Date(caso.fecha).toLocaleDateString('es-MX') : 'N/A'}</TableCell>
                    <TableCell>{caso.surveyName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-green-600">
            ✓ No hay casos críticos en este momento
          </div>
        )}
      </Card>
    </div>
  );
}
