import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Breadcrumb } from "@/components/Breadcrumb";
// Using alert for now instead of toast
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  PieChart,
  Download,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";

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

export default function AlertMetricsDashboard() {
  const [months, setMonths] = useState(6);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}\n${opts.description}`);
  };

  // Query para obtener estadísticas generales
  const { data: stats, isLoading: loadingStats } = trpc.alerts.getStats.useQuery();

  // Query para obtener tendencias históricas
  const { data: trends, isLoading: loadingTrends } = trpc.alerts.getTrends.useQuery({ months });

  // Query para obtener métricas de resolución
  const { data: resolutionMetrics, isLoading: loadingResolution } = trpc.alerts.getResolutionMetrics.useQuery();

  // Función para exportar dashboard a PDF
  const exportToPDF = async () => {
    if (!dashboardRef.current) return;

    setIsExporting(true);
    toast({
      title: "Generando PDF",
      description: "Por favor espera mientras se genera el documento...",
    });

    try {
      // Capturar el contenido del dashboard
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        logging: false,
        useCORS: true,
      });

      // Crear PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Agregar primera página
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Agregar páginas adicionales si es necesario
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Descargar PDF
      const fecha = new Date().toISOString().split("T")[0];
      pdf.save(`dashboard-metricas-alertas-${fecha}.pdf`);

      toast({
        title: "Éxito",
        description: "El PDF se ha generado correctamente",
      });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast({
        title: "Error",
        description: "No se pudo generar el PDF. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Configuración de gráfica de tendencias
  const trendsData = {
    labels: trends?.map((t) => t.month) || [],
    datasets: [
      {
        label: "Alertas Activas",
        data: trends?.map((t) => t.activeAlerts) || [],
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.5)",
        tension: 0.3,
      },
      {
        label: "Alertas Resueltas",
        data: trends?.map((t) => t.resolvedAlerts) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const trendsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Tendencia de Alertas por Mes",
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

  // Configuración de gráfica de distribución por tipo
  const typeDistributionData = {
    labels: ["Casos Críticos", "Cobertura Baja", "Cumplimiento Excelente"],
    datasets: [
      {
        label: "Alertas por Tipo",
        data: [
          stats?.criticalCases || 0,
          stats?.lowCoverage || 0,
          stats?.excellentCompliance || 0,
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(34, 197, 94, 0.8)",
        ],
        borderColor: [
          "rgb(239, 68, 68)",
          "rgb(251, 191, 36)",
          "rgb(34, 197, 94)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const typeDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Distribución por Tipo de Alerta",
      },
    },
  };

  // Configuración de gráfica de distribución por prioridad (Doughnut)
  const priorityDistributionData = {
    labels: ["Crítica", "Advertencia", "Información"],
    datasets: [
      {
        label: "Alertas por Prioridad",
        data: [
          stats?.criticalCases || 0, // Asumiendo que critical cases son críticas
          stats?.lowCoverage || 0, // Asumiendo que low coverage son advertencias
          stats?.excellentCompliance || 0, // Asumiendo que excellent compliance son info
        ],
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(59, 130, 246, 0.8)",
        ],
        borderColor: [
          "rgb(239, 68, 68)",
          "rgb(251, 191, 36)",
          "rgb(59, 130, 246)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const priorityDistributionOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: true,
        text: "Distribución por Prioridad",
      },
    },
  };

  // Calcular tasa de resolución
  const totalAlerts = (stats?.activeAlerts || 0) + (stats?.resolvedAlerts || 0);
  const resolutionRate = totalAlerts > 0 ? ((stats?.resolvedAlerts || 0) / totalAlerts) * 100 : 0;

  return (
    <div className="container py-6 space-y-6" ref={dashboardRef}>
      <Breadcrumb
        items={[
          { label: "Administración", href: "/admin" },
          { label: "Dashboard de Métricas de Alertas" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard de Métricas de Alertas</h1>
          <p className="text-muted-foreground mt-2">
            Análisis avanzado de alertas para auditoría de cumplimiento NOM-035
          </p>
        </div>
        <Button
          onClick={exportToPDF}
          disabled={isExporting || loadingStats || loadingTrends || loadingResolution}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? "Generando PDF..." : "Exportar a PDF"}
        </Button>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Todas las alertas registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.activeAlerts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Resueltas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.resolvedAlerts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completadas exitosamente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Resolución</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{resolutionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Alertas resueltas del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia Histórica */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Histórica</CardTitle>
            <CardDescription>
              Evolución de alertas activas y resueltas en los últimos {months} meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingTrends ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : (
                <Line data={trendsData} options={trendsOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribución por Tipo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo</CardTitle>
            <CardDescription>
              Cantidad de alertas por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : (
                <Bar data={typeDistributionData} options={typeDistributionOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribución por Prioridad */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Prioridad</CardTitle>
            <CardDescription>
              Proporción de alertas según su nivel de prioridad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {loadingStats ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : (
                <Doughnut data={priorityDistributionData} options={priorityDistributionOptions} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tiempo Promedio de Resolución */}
        <Card>
          <CardHeader>
            <CardTitle>Tiempo Promedio de Resolución</CardTitle>
            <CardDescription>
              Tiempo promedio para resolver alertas por tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-primary" />
                <div>
                  <p className="text-sm font-medium">Promedio General</p>
                  <p className="text-xs text-muted-foreground">Todas las alertas resueltas</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-primary">
                {loadingResolution ? "..." : `${(resolutionMetrics?.avgResolutionTime || 0).toFixed(1)}h`}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Casos Críticos</p>
                  <p className="text-xs text-muted-foreground">Más de 50 casos abiertos</p>
                </div>
                <span className="text-xl font-bold text-red-600">
                  {loadingResolution ? "..." : `${(resolutionMetrics?.byType.critical_cases || 0).toFixed(1)}h`}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Cobertura Baja</p>
                  <p className="text-xs text-muted-foreground">Menos del 80% de encuestas</p>
                </div>
                <span className="text-xl font-bold text-yellow-600">
                  {loadingResolution ? "..." : `${(resolutionMetrics?.byType.low_coverage || 0).toFixed(1)}h`}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Cumplimiento Excelente</p>
                  <p className="text-xs text-muted-foreground">100% de cobertura alcanzada</p>
                </div>
                <span className="text-xl font-bold text-green-600">
                  {loadingResolution ? "..." : `${(resolutionMetrics?.byType.excellent_compliance || 0).toFixed(1)}h`}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Total de alertas resueltas: {resolutionMetrics?.totalResolved || 0}
            </div>
          </CardContent>
        </Card>

        {/* Métricas Adicionales */}
        <Card>
          <CardHeader>
            <CardTitle>Métricas de Cumplimiento</CardTitle>
            <CardDescription>
              Indicadores clave para auditoría NOM-035
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium">Casos Críticos</p>
                  <p className="text-xs text-muted-foreground">Más de 50 casos abiertos</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-red-600">{stats?.criticalCases || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">Cobertura Baja</p>
                  <p className="text-xs text-muted-foreground">Menos del 80% de encuestas</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-yellow-600">{stats?.lowCoverage || 0}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Cumplimiento Excelente</p>
                  <p className="text-xs text-muted-foreground">100% de cobertura alcanzada</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-green-600">{stats?.excellentCompliance || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
