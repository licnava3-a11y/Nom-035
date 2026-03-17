/**
 * Página de Tendencias Departamentales
 * Heat map interactivo de concentración de casos y niveles de riesgo por departamento
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Chart, registerables } from "chart.js";

// Registrar componentes de Chart.js
Chart.register(...registerables);

export default function DepartmentalTrends() {
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});
  
  const heatMapRef = useRef<HTMLCanvasElement>(null);
  const heatMapChartRef = useRef<Chart | null>(null);

  // Query para obtener métricas departamentales
  const { data: metrics, isLoading } = trpc.departmentalTrends.getDepartmentalRiskMetrics.useQuery(
    dateRange
  );

  // Query para obtener alertas
  const { data: alerts } = trpc.departmentalTrends.getDepartmentalAlerts.useQuery();

  // Renderizar heat map cuando los datos estén disponibles
  useEffect(() => {
    if (!metrics || !heatMapRef.current) return;

    // Destruir chart anterior si existe
    if (heatMapChartRef.current) {
      heatMapChartRef.current.destroy();
    }

    const ctx = heatMapRef.current.getContext("2d");
    if (!ctx) return;

    // Preparar datos para heat map (matriz de departamentos)
    const departments = metrics.departments;
    const labels = departments.map((d: any) => d.departmentName);
    const riskScores = departments.map((d: any) => d.riskScore);
    const criticalCases = departments.map((d: any) => d.criticalCases);
    const openCases = departments.map((d: any) => d.openCases);

    // Colores basados en nivel de riesgo
    const backgroundColors = departments.map((d: any) => {
      if (d.alertLevel === "critical") return "rgba(220, 38, 38, 0.8)"; // red-600
      if (d.alertLevel === "high") return "rgba(234, 88, 12, 0.8)"; // orange-600
      if (d.alertLevel === "medium") return "rgba(234, 179, 8, 0.8)"; // yellow-600
      return "rgba(34, 197, 94, 0.8)"; // green-600
    });

    heatMapChartRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Score de Riesgo",
            data: riskScores,
            backgroundColor: backgroundColors,
            borderColor: backgroundColors.map((c: any) => c.replace("0.8", "1")),
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y", // Barras horizontales
        plugins: {
          title: {
            display: true,
            text: "Heat Map de Riesgo Departamental",
            font: { size: 18, weight: "bold" },
          },
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const index = context.dataIndex;
                const dept = departments[index];
                return [
                  `Casos totales: ${dept.totalCases}`,
                  `Casos críticos: ${dept.criticalCases}`,
                  `Casos abiertos: ${dept.openCases}`,
                  `Tiempo promedio: ${dept.avgResolutionDays} días`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: "Score de Riesgo (0-100)",
            },
          },
          y: {
            ticks: {
              font: { size: 12 },
            },
          },
        },
      },
    });

    return () => {
      if (heatMapChartRef.current) {
        heatMapChartRef.current.destroy();
      }
    };
  }, [metrics]);

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "high":
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case "medium":
        return <TrendingUp className="h-5 w-5 text-yellow-600" />;
      default:
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  const getAlertBadge = (severity: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      critical: "destructive",
      high: "destructive",
      medium: "secondary",
      low: "outline",
    };

    const labels: Record<string, string> = {
      critical: "Crítico",
      high: "Alto",
      medium: "Medio",
      low: "Bajo",
    };

    return (
      <Badge variant={variants[severity] || "outline"}>
        {labels[severity] || severity}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando tendencias departamentales...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudieron cargar las métricas departamentales</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tendencias Departamentales</h1>
        <p className="text-muted-foreground mt-2">
          Análisis de concentración de casos y niveles de riesgo por departamento
        </p>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Departamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.summary.totalDepartments}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Departamentos en Alerta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              {metrics.summary.departmentsInAlert}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Alto/Crítico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.summary.avgRiskScore}</p>
            <p className="text-xs text-muted-foreground mt-1">
              De 100 puntos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Departamentos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {metrics.summary.criticalDepartments}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren intervención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas activas */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Alertas Activas</CardTitle>
            <CardDescription>
              Departamentos que superan umbrales de riesgo (últimos 30 días)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert, index) => (
              <Alert key={index} variant={alert.severity === "critical" ? "destructive" : "default"}>
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.severity)}
                  <div className="flex-1">
                    <AlertTitle className="flex items-center gap-2">
                      {alert.departmentName}
                      {getAlertBadge(alert.severity)}
                    </AlertTitle>
                    <AlertDescription className="mt-2">
                      {alert.message}
                    </AlertDescription>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Casos críticos: {alert.criticalCases}</span>
                      <span>Casos abiertos: {alert.openCases}</span>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Heat Map */}
      <Card>
        <CardHeader>
          <CardTitle>Heat Map de Riesgo</CardTitle>
          <CardDescription>
            Visualización de score de riesgo por departamento (0-100)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <canvas ref={heatMapRef}></canvas>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span>Bajo (0-24)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span>Medio (25-49)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-600 rounded"></div>
              <span>Alto (50-74)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span>Crítico (75-100)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de métricas detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalladas por Departamento</CardTitle>
          <CardDescription>
            Desglose completo de casos y tiempos de resolución
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Departamento</th>
                  <th className="text-center p-2">Score</th>
                  <th className="text-center p-2">Nivel</th>
                  <th className="text-center p-2">Total Casos</th>
                  <th className="text-center p-2">Abiertos</th>
                  <th className="text-center p-2">Críticos</th>
                  <th className="text-center p-2">Tiempo Prom.</th>
                </tr>
              </thead>
              <tbody>
                {metrics.departments.map((dept: any) => (
                  <tr key={dept.departmentId} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{dept.departmentName}</td>
                    <td className="text-center p-2">
                      <span className="font-bold">{dept.riskScore}</span>
                    </td>
                    <td className="text-center p-2">
                      {getAlertBadge(dept.alertLevel)}
                    </td>
                    <td className="text-center p-2">{dept.totalCases}</td>
                    <td className="text-center p-2">{dept.openCases}</td>
                    <td className="text-center p-2 text-red-600 font-semibold">
                      {dept.criticalCases}
                    </td>
                    <td className="text-center p-2">{dept.avgResolutionDays} días</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Metodología de Cálculo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Score de Riesgo (0-100):</strong> Fórmula ponderada que considera:
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>40% - Proporción de casos críticos</li>
            <li>30% - Proporción de casos abiertos</li>
            <li>20% - Tiempo promedio de resolución (&gt;30 días = máximo)</li>
            <li>10% - Proporción de casos de prioridad media</li>
          </ul>
          <p className="mt-4">
            • <strong>Niveles de Alerta:</strong>
          </p>
          <ul className="list-disc list-inside ml-4 space-y-1">
            <li>Bajo: 0-24 puntos</li>
            <li>Medio: 25-49 puntos</li>
            <li>Alto: 50-74 puntos</li>
            <li>Crítico: 75-100 puntos</li>
          </ul>
          <p className="mt-4">
            • <strong>Alertas Automáticas:</strong> Se generan cuando un departamento tiene 3+ casos críticos o 5+ casos abiertos en los últimos 30 días.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
