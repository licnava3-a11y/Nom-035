import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, AlertTriangle, FileText, Target, Activity } from "lucide-react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function TalentDashboard() {
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const { data: metrics, isLoading } = trpc.talentDashboard.getDashboardMetrics.useQuery({
    departmentId,
    period,
  });

  const { data: departments } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertDescription>No se pudieron cargar las métricas del dashboard.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Nine Box Matrix Data
  const nineBoxData = Array.from({ length: 9 }, (_, i) => {
    const performance = Math.floor(i / 3) + 1;
    const potential = (i % 3) + 1;
    const cell = metrics.nineBoxMatrix.find((m: any) => m.performance === performance && m.potential === potential
    );
    return { performance, potential, count: cell?.count || 0 };
  });

  // Tendencias Chart Data
  const trendsChartData = {
    labels: metrics.trends.map((t: any) => t.month),
    datasets: [
      {
        label: "Score Promedio de Retención",
        data: metrics.trends.map((t: any) => t.avgRetentionScore),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
      {
        label: "Empleados en Riesgo Alto",
        data: metrics.trends.map((t: any) => t.highRiskCount),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Distribución de Riesgo Chart Data
  const riskDistributionData = {
    labels: ["Riesgo Bajo", "Riesgo Medio", "Riesgo Alto", "Riesgo Crítico"],
    datasets: [
      {
        data: [
          metrics.kpis.activeEmployees - metrics.kpis.highRiskCount,
          metrics.kpis.highRiskCount - metrics.kpis.criticalRiskCount,
          metrics.kpis.criticalRiskCount,
          0, // Placeholder
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(234, 179, 8, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(234, 179, 8)",
          "rgb(249, 115, 22)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Consolidado de Talento</h1>
          <p className="text-muted-foreground">
            Vista ejecutiva unificada de métricas clave de gestión de talento
          </p>
        </div>
        <div className="flex gap-4">
          <Select
            value={departmentId?.toString() || "all"}
            onValueChange={(value) =>
              setDepartmentId(value === "all" ? undefined : parseInt(value))
            }
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments?.data?.map((dept: any) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mes Actual</SelectItem>
              <SelectItem value="quarter">Trimestre Actual</SelectItem>
              <SelectItem value="year">Año Actual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.kpis.activeEmployees}</div>
            <p className="text-xs text-muted-foreground">
              de {metrics.kpis.totalEmployees} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.kpis.retentionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Score promedio: {metrics.kpis.avgRetentionScore.toFixed(1)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Crítico</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.kpis.criticalRiskCount}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.kpis.highRiskCount} en riesgo alto total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes Enviados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.reports.sent}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.reports.pending} pendientes, {metrics.reports.failed} fallidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="ninebox">Nine Box Matrix</TabsTrigger>
          <TabsTrigger value="retention">Retención</TabsTrigger>
          <TabsTrigger value="alerts">Alertas de Riesgo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Tendencias */}
            <Card>
              <CardHeader>
                <CardTitle>Tendencias (Últimos 6 Meses)</CardTitle>
                <CardDescription>
                  Evolución del score de retención y empleados en riesgo alto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line
                    data={trendsChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top",
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
              </CardContent>
            </Card>

            {/* Distribución de Riesgo */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Riesgo</CardTitle>
                <CardDescription>
                  Clasificación de empleados por nivel de riesgo psicosocial
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Pie
                    data={riskDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "right",
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ninebox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nine Box Matrix</CardTitle>
              <CardDescription>
                Distribución de empleados según desempeño y potencial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {nineBoxData.reverse().map((cell, index) => {
                  const bgColor =
                    cell.performance === 3 && cell.potential === 3
                      ? "bg-green-100 border-green-500"
                      : cell.performance >= 2 && cell.potential >= 2
                      ? "bg-blue-100 border-blue-500"
                      : cell.performance === 1 || cell.potential === 1
                      ? "bg-red-100 border-red-500"
                      : "bg-yellow-100 border-yellow-500";

                  return (
                    <div
                      key={index}
                      className={`border-2 ${bgColor} p-4 rounded-lg text-center`}
                    >
                      <div className="text-2xl font-bold">{cell.count}</div>
                      <div className="text-xs text-muted-foreground">
                        D{cell.performance} / P{cell.potential}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>← Bajo Potencial</span>
                <span>Alto Potencial →</span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground text-center">
                ↑ Alto Desempeño | Bajo Desempeño ↓
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados con Menor Score de Retención</CardTitle>
              <CardDescription>
                Top 10 empleados en riesgo de rotación (requieren atención prioritaria)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.retentionScores.map((emp: any) => (
                  <div
                    key={emp.employeeId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{emp.employeeName}</div>
                      <div className="text-sm text-muted-foreground">
                        {emp.departmentName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          emp.retentionScore < 30
                            ? "destructive"
                            : emp.retentionScore < 50
                            ? "default"
                            : "secondary"
                        }
                      >
                        Score: {emp.retentionScore}
                      </Badge>
                      <Badge variant="outline">{emp.riskLevel}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.riskAlerts.total}</div>
                <p className="text-xs text-muted-foreground">En el período seleccionado</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
                <Target className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.riskAlerts.active}
                </div>
                <p className="text-xs text-muted-foreground">Requieren seguimiento</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {metrics.riskAlerts.critical}
                </div>
                <p className="text-xs text-muted-foreground">Atención inmediata</p>
              </CardContent>
            </Card>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {metrics.riskAlerts.critical > 0
                ? `Hay ${metrics.riskAlerts.critical} alertas críticas que requieren atención inmediata. Revise el módulo de Alertas Tempranas para más detalles.`
                : "No hay alertas críticas en este momento. Continúe monitoreando las alertas activas."}
            </AlertDescription>
          </Alert>
        </TabsContent>
      </Tabs>
    </div>
  );
}
