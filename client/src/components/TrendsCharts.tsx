import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import Chart from "chart.js/auto";

interface TrendsChartsProps {
  className?: string;
}

export default function TrendsCharts({ className }: TrendsChartsProps) {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [dateRange, setDateRange] = useState<'last30' | 'last90' | 'last180' | 'currentYear'>('last90');
  
  // Refs para los canvas de Chart.js
  const casesChartRef = useRef<HTMLCanvasElement>(null);
  const coverageChartRef = useRef<HTMLCanvasElement>(null);
  const complianceChartRef = useRef<HTMLCanvasElement>(null);
  
  // Refs para las instancias de Chart.js
  const casesChartInstance = useRef<Chart | null>(null);
  const coverageChartInstance = useRef<Chart | null>(null);
  const complianceChartInstance = useRef<Chart | null>(null);

  // Calcular fechas según rango seleccionado
  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    
    switch (dateRange) {
      case 'last30':
        start.setDate(start.getDate() - 30);
        break;
      case 'last90':
        start.setDate(start.getDate() - 90);
        break;
      case 'last180':
        start.setDate(start.getDate() - 180);
        break;
      case 'currentYear':
        start.setMonth(0, 1);
        break;
    }
    
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const dates = getDateRange();

  // Queries
  const { data: casesTrends, isLoading: loadingCases } = trpc.trends.getCasesTrends.useQuery({
    period,
    ...dates,
  });

  const { data: coverageTrends, isLoading: loadingCoverage } = trpc.trends.getSurveyCoverageTrends.useQuery({
    period,
    ...dates,
  });

  const { data: complianceTrends, isLoading: loadingCompliance } = trpc.trends.getComplianceTrends.useQuery({
    period,
    ...dates,
  });

  // Renderizar gráfica de casos
  useEffect(() => {
    if (!casesTrends || !casesChartRef.current) return;

    // Destruir gráfica anterior si existe
    if (casesChartInstance.current) {
      casesChartInstance.current.destroy();
    }

    const ctx = casesChartRef.current.getContext('2d');
    if (!ctx) return;

    casesChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: casesTrends.current.map(item => item.period),
        datasets: [
          {
            label: 'Total de Casos',
            data: casesTrends.current.map(item => item.total),
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Casos Abiertos',
            data: casesTrends.current.map(item => item.abiertos),
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
          },
          {
            label: 'En Investigación',
            data: casesTrends.current.map(item => item.enInvestigacion),
            borderColor: 'rgb(251, 191, 36)',
            backgroundColor: 'rgba(251, 191, 36, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Casos Cerrados',
            data: casesTrends.current.map(item => item.cerrados),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      if (casesChartInstance.current) {
        casesChartInstance.current.destroy();
      }
    };
  }, [casesTrends]);

  // Renderizar gráfica de cobertura
  useEffect(() => {
    if (!coverageTrends || !coverageChartRef.current) return;

    if (coverageChartInstance.current) {
      coverageChartInstance.current.destroy();
    }

    const ctx = coverageChartRef.current.getContext('2d');
    if (!ctx) return;

    coverageChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: coverageTrends.current.map(item => item.period),
        datasets: [
          {
            label: 'Guía I',
            data: coverageTrends.current.map(item => item.guiaI),
            backgroundColor: 'rgba(99, 102, 241, 0.8)',
          },
          {
            label: 'Guía II',
            data: coverageTrends.current.map(item => item.guiaII),
            backgroundColor: 'rgba(168, 85, 247, 0.8)',
          },
          {
            label: 'Guía III',
            data: coverageTrends.current.map(item => item.guiaIII),
            backgroundColor: 'rgba(236, 72, 153, 0.8)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
          },
        },
        scales: {
          x: {
            stacked: true,
          },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      if (coverageChartInstance.current) {
        coverageChartInstance.current.destroy();
      }
    };
  }, [coverageTrends]);

  // Renderizar gráfica de cumplimiento
  useEffect(() => {
    if (!complianceTrends || !complianceChartRef.current) return;

    if (complianceChartInstance.current) {
      complianceChartInstance.current.destroy();
    }

    const ctx = complianceChartRef.current.getContext('2d');
    if (!ctx) return;

    complianceChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: complianceTrends.current.map(item => item.period),
        datasets: [
          {
            label: 'Porcentaje de Cumplimiento',
            data: complianceTrends.current.map(item => item.porcentajeCumplimiento),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.2)',
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${context.parsed.y}%`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });

    return () => {
      if (complianceChartInstance.current) {
        complianceChartInstance.current.destroy();
      }
    };
  }, [complianceTrends]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'bg-green-100 text-green-800';
      case 'down':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={className}>
      {/* Controles de filtrado */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Últimos 30 días</SelectItem>
              <SelectItem value="last90">Últimos 90 días</SelectItem>
              <SelectItem value="last180">Últimos 180 días</SelectItem>
              <SelectItem value="currentYear">Año actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* Tendencia de Casos NOM-035 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Casos NOM-035</CardTitle>
                <CardDescription>Evolución de casos de riesgo psicosocial</CardDescription>
              </div>
              {casesTrends && (
                <div className="flex items-center gap-2">
                  {getTrendIcon(casesTrends.comparison.trend)}
                  <Badge className={getTrendColor(casesTrends.comparison.trend)}>
                    {casesTrends.comparison.percentageChange > 0 ? '+' : ''}
                    {casesTrends.comparison.percentageChange}%
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingCases ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : (
              <div className="h-[300px]">
                <canvas ref={casesChartRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tendencia de Cobertura de Encuestas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cobertura de Encuestas</CardTitle>
                <CardDescription>Encuestas completadas por guía</CardDescription>
              </div>
              {coverageTrends && (
                <div className="flex items-center gap-2">
                  {getTrendIcon(coverageTrends.comparison.trend)}
                  <Badge className={getTrendColor(coverageTrends.comparison.trend)}>
                    {coverageTrends.comparison.percentageChange > 0 ? '+' : ''}
                    {coverageTrends.comparison.percentageChange}%
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingCoverage ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : (
              <div className="h-[300px]">
                <canvas ref={coverageChartRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tendencia de Cumplimiento Normativo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cumplimiento Normativo NOM-035</CardTitle>
                <CardDescription>
                  Porcentaje de empleados con encuestas completadas
                  {complianceTrends && ` (${complianceTrends.totalEmployees} empleados totales)`}
                </CardDescription>
              </div>
              {complianceTrends && (
                <div className="flex items-center gap-2">
                  {getTrendIcon(complianceTrends.comparison.trend)}
                  <Badge className={getTrendColor(complianceTrends.comparison.trend)}>
                    {complianceTrends.comparison.percentageChange > 0 ? '+' : ''}
                    {complianceTrends.comparison.percentageChange}%
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loadingCompliance ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Cargando datos...
              </div>
            ) : (
              <div className="h-[300px]">
                <canvas ref={complianceChartRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
