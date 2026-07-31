import { useState, useMemo } from 'react';
import { Breadcrumb } from "@/components/Breadcrumb";
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Send, CheckCircle2, Clock, XCircle, Download, Search, Users, TrendingUp, BarChart3, PieChart, Filter } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, PolarArea } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Paleta de colores NOM-035
const COLORS = {
  completed: '#10B981',
  pending: '#F59E0B',
  expired: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
  orange: '#F97316',
  indigo: '#6366F1',
  rose: '#F43F5E',
};

const GENDER_COLORS: Record<string, string> = {
  'Masculino': '#3B82F6',
  'Femenino': '#EC4899',
  'Otro': '#8B5CF6',
  'No especificado': '#9CA3AF',
};

const AGE_COLORS = ['#6366F1', '#3B82F6', '#14B8A6', '#10B981', '#9CA3AF'];

/**
 * Dashboard de Seguimiento de Tokens de Encuestas NOM-035
 * Con gráficos interactivos avanzados de segmentación demográfica
 */
export default function TokensDashboard() {
  const [selectedSurvey, setSelectedSurvey] = useState<number | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  // Obtener estadísticas de tokens
  const { data: stats, isLoading } = trpc.surveys.getTokenStats.useQuery({
    surveyId: selectedSurvey,
    department: selectedDepartment,
  });

  // Obtener lista de encuestas para filtro
  const { data: surveys } = trpc.surveys.getAll.useQuery();

  // Datos memoizados para los gráficos
  const chartData = useMemo(() => {
    if (!stats) return null;

    // Gráfica de estado general (Doughnut)
    const statusChart = {
      labels: ['Completados', 'Pendientes', 'Expirados'],
      datasets: [{
        data: [stats.completedTokens, stats.pendingTokens, stats.expiredTokens],
        backgroundColor: [COLORS.completed, COLORS.pending, COLORS.expired],
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };

    // Gráfica por departamento (Barras apiladas horizontales)
    const deptData = stats.byDepartment.slice(0, 12); // Máximo 12 departamentos
    const departmentChart = {
      labels: deptData.map(d => d.department.length > 20 ? d.department.substring(0, 20) + '…' : d.department),
      datasets: [
        { label: 'Completados', data: deptData.map(d => d.completed), backgroundColor: COLORS.completed },
        { label: 'Pendientes', data: deptData.map(d => d.pending), backgroundColor: COLORS.pending },
        { label: 'Expirados', data: deptData.map(d => d.expired), backgroundColor: COLORS.expired },
      ],
    };

    // Gráfica por puesto (Barras horizontales)
    const posData = ((stats as any).byPosition ?? []).slice(0, 10);
    const positionChart = {
      labels: posData.map((p: any) => p.position.length > 25 ? p.position.substring(0, 25) + '…' : p.position),
      datasets: [
        { label: 'Completados', data: posData.map((p: any) => p.completed), backgroundColor: COLORS.completed },
        { label: 'Pendientes', data: posData.map((p: any) => p.pending), backgroundColor: COLORS.pending },
        { label: 'Expirados', data: posData.map((p: any) => p.expired), backgroundColor: COLORS.expired },
      ],
    };

    // Gráfica por género (Doughnut)
    const genderData = (stats as any).byGender ?? [];
    const genderChart = {
      labels: genderData.map((g: any) => g.sexo),
      datasets: [{
        data: genderData.map((g: any) => g.total),
        backgroundColor: genderData.map((g: any) => GENDER_COLORS[g.sexo] ?? '#9CA3AF'),
        borderWidth: 2,
        borderColor: '#fff',
      }],
    };

    // Gráfica de completados por género
    const genderCompletionChart = {
      labels: genderData.map((g: any) => g.sexo),
      datasets: [
        { label: 'Completados', data: genderData.map((g: any) => g.completed), backgroundColor: COLORS.completed },
        { label: 'Pendientes', data: genderData.map((g: any) => g.pending), backgroundColor: COLORS.pending },
        { label: 'Expirados', data: genderData.map((g: any) => g.expired), backgroundColor: COLORS.expired },
      ],
    };

    // Gráfica por rango de edad NOM-035 (PolarArea)
    const ageData = (stats as any).byAgeGroup ?? [];
    const ageChart = {
      labels: ageData.map((a: any) => `${a.group} años`),
      datasets: [{
        data: ageData.map((a: any) => a.total),
        backgroundColor: AGE_COLORS.slice(0, ageData.length).map(c => c + 'CC'),
        borderColor: AGE_COLORS.slice(0, ageData.length),
        borderWidth: 2,
      }],
    };

    // Gráfica de tasa de completado por rango de edad
    const ageCompletionChart = {
      labels: ageData.map((a: any) => `${a.group} años`),
      datasets: [{
        label: '% Completado',
        data: ageData.map((a: any) => a.completionRate),
        backgroundColor: ageData.map((_: any, i: number) => AGE_COLORS[i % AGE_COLORS.length] + '99'),
        borderColor: ageData.map((_: any, i: number) => AGE_COLORS[i % AGE_COLORS.length]),
        borderWidth: 2,
      }],
    };

    // Tasa de completado por departamento
    const deptRateChart = {
      labels: deptData.map(d => d.department.length > 20 ? d.department.substring(0, 20) + '…' : d.department),
      datasets: [{
        label: '% Completado',
        data: deptData.map(d => d.completionRate),
        backgroundColor: deptData.map(d =>
          d.completionRate >= 80 ? COLORS.completed + '99' :
          d.completionRate >= 50 ? COLORS.pending + '99' :
          COLORS.expired + '99'
        ),
        borderColor: deptData.map(d =>
          d.completionRate >= 80 ? COLORS.completed :
          d.completionRate >= 50 ? COLORS.pending :
          COLORS.expired
        ),
        borderWidth: 2,
      }],
    };

    return { statusChart, departmentChart, positionChart, genderChart, genderCompletionChart, ageChart, ageCompletionChart, deptRateChart };
  }, [stats]);

  // Filtrar tokens por búsqueda
  const filteredTokens = useMemo(() => {
    if (!stats) return [];
    return stats.tokens.filter((t: any) =>
      t.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.employeeEmail?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stats, searchTerm]);

  const barOptions = (horizontal = false, stacked = false, yLabel = '') => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: (horizontal ? 'y' : 'x') as 'x' | 'y',
    scales: {
      x: { stacked, grid: { display: !horizontal } },
      y: { stacked, grid: { display: horizontal }, title: yLabel ? { display: true, text: yLabel } : undefined },
    },
    plugins: {
      legend: { position: 'bottom' as const },
      tooltip: { mode: 'index' as const, intersect: false },
    },
  });

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
          },
        },
      },
    },
  };

  const percentBarOptions = (horizontal = false) => ({
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: (horizontal ? 'y' : 'x') as 'x' | 'y',
    scales: {
      x: { min: 0, max: 100, ticks: { callback: (v: any) => `${v}%` } },
      y: {},
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.raw.toFixed(1)}% completado`,
        },
      },
    },
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Breadcrumb items={[{ label: "Encuestas NOM-035", href: "/surveys" }, { label: "Tokens de Acceso" }]} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || !chartData) {
    return (
      <div className="container py-8">
        <p className="text-center text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  const genderData = (stats as any).byGender ?? [];
  const ageData = (stats as any).byAgeGroup ?? [];

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Breadcrumb items={[{ label: "Encuestas NOM-035", href: "/surveys" }, { label: "Dashboard de Tokens" }]} />
          <h1 className="text-3xl font-bold mt-2">Dashboard de Participación</h1>
          <p className="text-muted-foreground mt-1">
            Seguimiento y análisis demográfico de encuestas NOM-035
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          Filtros de visualización
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Encuesta</label>
            <Select
              value={selectedSurvey?.toString() || 'all'}
              onValueChange={(value) => setSelectedSurvey(value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las encuestas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las encuestas</SelectItem>
                {surveys?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Departamento</label>
            <Select
              value={selectedDepartment || 'all'}
              onValueChange={(value) => setSelectedDepartment(value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {stats.byDepartment.map(d => (
                  <SelectItem key={d.department} value={d.department}>{d.department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Buscar empleado</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 rounded-lg"><Send className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Enviados</p>
              <p className="text-2xl font-bold">{stats.totalTokens}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-100 rounded-lg"><CheckCircle2 className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Completados</p>
              <p className="text-2xl font-bold text-green-700">{stats.completedTokens}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-yellow-100 rounded-lg"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-700">{stats.pendingTokens}</p>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 rounded-lg"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Tasa de Respuesta</p>
              <p className="text-2xl font-bold text-emerald-700">{stats.completionRate.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de progreso general */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Progreso General de Participación</h2>
          <span className="text-sm text-muted-foreground">
            {stats.completedTokens} de {stats.totalTokens} trabajadores
          </span>
        </div>
        <div className="h-5 bg-muted rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${stats.totalTokens > 0 ? (stats.completedTokens / stats.totalTokens) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-yellow-400 transition-all"
            style={{ width: `${stats.totalTokens > 0 ? (stats.pendingTokens / stats.totalTokens) * 100 : 0}%` }}
          />
          <div
            className="h-full bg-red-400 transition-all"
            style={{ width: `${stats.totalTokens > 0 ? (stats.expiredTokens / stats.totalTokens) * 100 : 0}%` }}
          />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> Completados</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> Pendientes</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span> Expirados</span>
        </div>
      </Card>

      {/* Tabs de análisis */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="overview" className="flex items-center gap-1.5">
            <PieChart className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="org" className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Org.
          </TabsTrigger>
          <TabsTrigger value="demo" className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            Demog.
          </TabsTrigger>
          <TabsTrigger value="detail" className="flex items-center gap-1.5">
            <Search className="h-4 w-4" />
            Detalle
          </TabsTrigger>
        </TabsList>

        {/* Tab: Visión General */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Distribución por Estado</h3>
              <div className="h-[280px]">
                <Doughnut data={chartData.statusChart} options={doughnutOptions} />
              </div>
            </Card>

            {genderData.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Distribución por Género</h3>
                <div className="h-[280px]">
                  <Doughnut data={chartData.genderChart} options={doughnutOptions} />
                </div>
              </Card>
            )}

            {ageData.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Distribución por Rango de Edad (NOM-035)</h3>
                <div className="h-[280px]">
                  <PolarArea
                    data={chartData.ageChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'right' as const },
                        tooltip: {
                          callbacks: {
                            label: (ctx: any) => {
                              const total = ctx.dataset.data.reduce((a: number, b: number) => a + b, 0);
                              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0';
                              return ` ${ctx.label}: ${ctx.raw} trabajadores (${pct}%)`;
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Clasificación de grupos etarios según criterios NOM-035-STPS-2018
                </p>
              </Card>
            )}

            {ageData.length > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Tasa de Completado por Rango de Edad</h3>
                <div className="h-[280px]">
                  <Bar data={chartData.ageCompletionChart} options={percentBarOptions(true) as any} />
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Análisis Organizacional */}
        <TabsContent value="org" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 gap-6">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Participación por Departamento</h3>
              <div className="h-[350px]">
                <Bar data={chartData.departmentChart} options={barOptions(true, true) as any} />
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-4">Tasa de Completado por Departamento</h3>
              <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-400 inline-block"></span> ≥80% Óptimo</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block"></span> 50-79% Regular</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block"></span> &lt;50% Crítico</span>
              </div>
              <div className="h-[350px]">
                <Bar data={chartData.deptRateChart} options={percentBarOptions(true) as any} />
              </div>
            </Card>

            {((stats as any).byPosition?.length ?? 0) > 0 && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Participación por Puesto</h3>
                <div className="h-[350px]">
                  <Bar data={chartData.positionChart} options={barOptions(true, true) as any} />
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Tab: Análisis Demográfico */}
        <TabsContent value="demo" className="space-y-6 pt-4">
          {genderData.length > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Estado de Participación por Género</h3>
              <div className="h-[280px]">
                <Bar data={chartData.genderCompletionChart} options={barOptions(false, true) as any} />
              </div>
            </Card>
          )}

          {ageData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="font-semibold mb-1">Distribución por Rango de Edad</h3>
                <p className="text-xs text-muted-foreground mb-4">Grupos etarios según NOM-035-STPS-2018</p>
                <div className="space-y-3">
                  {ageData.map((a: any, i: number) => (
                    <div key={a.group}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{a.group} años</span>
                        <span className="text-muted-foreground">{a.total} trabajadores ({a.completionRate.toFixed(0)}% completado)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${a.total > 0 ? (a.completed / a.total) * 100 : 0}%`,
                            backgroundColor: AGE_COLORS[i % AGE_COLORS.length],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="font-semibold mb-1">Resumen Demográfico</h3>
                <p className="text-xs text-muted-foreground mb-4">Distribución de la muestra</p>
                <div className="space-y-4">
                  {genderData.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Por género</p>
                      <div className="space-y-1.5">
                        {genderData.map((g: any) => (
                          <div key={g.sexo} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full inline-block"
                                style={{ backgroundColor: GENDER_COLORS[g.sexo] ?? '#9CA3AF' }}
                              />
                              {g.sexo}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">{g.total}</span>
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: g.completionRate >= 80 ? '#D1FAE5' : g.completionRate >= 50 ? '#FEF3C7' : '#FEE2E2',
                                  color: g.completionRate >= 80 ? '#065F46' : g.completionRate >= 50 ? '#92400E' : '#991B1B',
                                }}
                              >
                                {g.completionRate.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium mb-2">Alertas de cobertura</p>
                    {stats.byDepartment.filter(d => d.completionRate < 50).length > 0 ? (
                      <div className="space-y-1">
                        {stats.byDepartment
                          .filter(d => d.completionRate < 50)
                          .slice(0, 5)
                          .map(d => (
                            <div key={d.department} className="flex items-center justify-between text-sm">
                              <span className="text-red-700 font-medium truncate max-w-[180px]">{d.department}</span>
                              <Badge className="bg-red-100 text-red-800 text-xs">{d.completionRate.toFixed(0)}%</Badge>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">✓ Todos los departamentos superan el 50% de cobertura</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab: Detalle de Tokens */}
        <TabsContent value="detail" className="space-y-6 pt-4">
          {/* Trabajadores Pendientes Urgentes */}
          {stats.pendingTokens > 0 && (
            <Card className="p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Pendientes de Responder ({stats.tokens.filter((t: any) => t.status === 'pendiente').length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-semibold">Empleado</th>
                      <th className="text-left p-3 font-semibold">Departamento</th>
                      <th className="text-left p-3 font-semibold">Encuesta</th>
                      <th className="text-left p-3 font-semibold">Expira</th>
                      <th className="text-left p-3 font-semibold">Días Rest.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.tokens
                      .filter((t: any) => t.status === 'pendiente')
                      .sort((a: any, b: any) => {
                        const dA = a.expiresAt ? Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / 86400000) : 0;
                        const dB = b.expiresAt ? Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / 86400000) : 0;
                        return dA - dB;
                      })
                      .map((token: any) => {
                        const days = token.expiresAt
                          ? Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / 86400000)
                          : 0;
                        const urgent = days <= 3;
                        return (
                          <tr key={token.tokenId} className={`border-b hover:bg-muted/50 ${urgent ? 'bg-red-50' : ''}`}>
                            <td className="p-3 font-medium">{token.employeeName}</td>
                            <td className="p-3"><Badge variant="outline">{token.department || 'Sin depto.'}</Badge></td>
                            <td className="p-3">{token.surveyTitle}</td>
                            <td className="p-3">{token.expiresAt ? new Date(token.expiresAt).toLocaleDateString('es-MX') : '-'}</td>
                            <td className="p-3">
                              <Badge className={urgent ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                {days > 0 ? `${days}d` : 'Vencido'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Tabla completa de tokens */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Todos los Tokens ({filteredTokens.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">Empleado</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Departamento</th>
                    <th className="text-left p-3">Encuesta</th>
                    <th className="text-left p-3">Estado</th>
                    <th className="text-left p-3">Completado</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTokens.map((token: any) => (
                    <tr key={token.tokenId} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{token.employeeName}</td>
                      <td className="p-3 text-muted-foreground">{token.employeeEmail}</td>
                      <td className="p-3">{token.department}</td>
                      <td className="p-3">{token.surveyTitle}</td>
                      <td className="p-3">
                        {token.status === 'completado' && <Badge className="bg-green-100 text-green-800">Completado</Badge>}
                        {token.status === 'pendiente' && <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>}
                        {token.status === 'expirado' && <Badge className="bg-red-100 text-red-800">Expirado</Badge>}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {token.usedAt ? new Date(token.usedAt).toLocaleDateString('es-MX') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
