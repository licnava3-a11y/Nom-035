import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DateRangeFilter, DateRange } from '@/components/DateRangeFilter';
import { FileDown } from 'lucide-react';
import { Line, Pie, Bar } from 'react-chartjs-2';
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
  ChartOptions,
} from 'chart.js';

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

export default function CasesMetrics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'quarterly'>('monthly');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generatePDFMutation = trpc.reports.generateCasesPDF.useMutation();

  // Preparar filtros para query
  const queryParams = useMemo(() => {
    const params: any = {};
    if (dateRange?.from) {
      params.startDate = dateRange.from.toISOString();
    }
    if (dateRange?.to) {
      params.endDate = dateRange.to.toISOString();
    }
    return params;
  }, [dateRange]);

  const { data: metrics, isLoading } = trpc.cases.getMetrics.useQuery(queryParams);

  const handleGeneratePDF = async () => {
    if (!dateRange) {
      alert('Por favor selecciona un rango de fechas');
      return;
    }

    try {
      setIsGenerating(true);
      
      const result = await generatePDFMutation.mutateAsync({
        period: reportPeriod,
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });
      
      // Download file
      const blob = new Blob(
        [Uint8Array.from(atob(result.data), c => c.charCodeAt(0))],
        { type: 'application/pdf' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log(`Reporte PDF generado con ${result.totalCases} casos`);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar reporte PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  // Paleta de colores: negro, verde, azul marino, rojo
  const colors = {
    primary: '#1e3a8a', // azul marino (navy blue)
    success: '#16a34a', // verde
    danger: '#dc2626', // rojo
    dark: '#000000', // negro
    warning: '#f59e0b', // naranja (adicional)
  };

  // Configuración de gráfico de tendencias (casos por mes)
  const trendChartData = {
    labels: metrics?.casesByMonth.map((m: any) => m.month).reverse() || [],
    datasets: [
      {
        label: 'Casos Registrados',
        data: metrics?.casesByMonth.map((m: any) => Number(m.count)).reverse() || [],
        borderColor: colors.primary,
        backgroundColor: `${colors.primary}33`,
        tension: 0.4,
      },
    ],
  };

  const trendChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: false,
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
  };

  // Configuración de gráfico de distribución por tipo (pie chart)
  const typeLabels: Record<string, string> = {
    mobbing: 'Mobbing',
    burnout: 'Burnout',
    violence: 'Violencia',
    stress: 'Estrés',
    other: 'Otro',
  };

  const typeChartData = {
    labels: metrics?.casesByType.map((t: any) => typeLabels[t.type] || t.type) || [],
    datasets: [
      {
        label: 'Casos por Tipo',
        data: metrics?.casesByType.map((t: any) => Number(t.count)) || [],
        backgroundColor: [
          colors.primary,
          colors.success,
          colors.danger,
          colors.warning,
          colors.dark,
        ],
      },
    ],
  };

  const pieChartOptions: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  // Configuración de gráfico de distribución por prioridad (bar chart)
  const priorityLabels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
  };

  const priorityChartData = {
    labels: metrics?.casesByPriority.map((p: any) => priorityLabels[p.priority] || p.priority) || [],
    datasets: [
      {
        label: 'Casos por Prioridad',
        data: metrics?.casesByPriority.map((p: any) => Number(p.count)) || [],
        backgroundColor: [
          colors.success,
          colors.warning,
          colors.primary,
          colors.danger,
        ],
      },
    ],
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
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
  };

  // Configuración de gráfico de distribución por estado
  const statusLabels: Record<string, string> = {
    open: 'Abierto',
    investigating: 'En Investigación',
    resolved: 'Resuelto',
    closed: 'Cerrado',
  };

  const statusChartData = {
    labels: metrics?.casesByStatus.map((s: any) => statusLabels[s.status] || s.status) || [],
    datasets: [
      {
        label: 'Casos por Estado',
        data: metrics?.casesByStatus.map((s: any) => Number(s.count)) || [],
        backgroundColor: [
          colors.danger,
          colors.warning,
          colors.success,
          colors.dark,
        ],
      },
    ],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Cargando métricas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Métricas de Casos</h1>
          <p className="text-muted-foreground mt-2">
            Análisis y tendencias de casos de riesgo psicosocial
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensual</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || !dateRange}
            variant="default"
          >
            <FileDown className="h-4 w-4 mr-2" />
            {isGenerating ? 'Generando...' : 'Generar Reporte PDF'}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona un rango de fechas para filtrar las métricas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
            {dateRange && (
              <button
                onClick={() => setDateRange(undefined)}
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Métrica destacada: Tiempo promedio de resolución */}
      <Card>
        <CardHeader>
          <CardTitle>Tiempo Promedio de Resolución</CardTitle>
          <CardDescription>Días promedio desde apertura hasta cierre de caso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-primary">
            {metrics?.avgResolutionTime ? Math.round(metrics.avgResolutionTime) : 0} días
          </div>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de casos por mes */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Casos</CardTitle>
            <CardDescription>Casos registrados por mes (últimos 12 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Distribución por tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>Casos según tipo de riesgo psicosocial</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Pie data={typeChartData} options={pieChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Distribución por prioridad */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Prioridad</CardTitle>
            <CardDescription>Casos según nivel de prioridad asignado</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Bar data={priorityChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Distribución por estado */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
            <CardDescription>Casos según estado actual de atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <Bar data={statusChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
