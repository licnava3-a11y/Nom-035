import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, TrendingDown, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ModelPerformanceAlerts() {
  const { data: activeAlerts = [], isLoading: loadingActive, refetch: refetchActive } = trpc.modelPerformanceAlerts.getActiveAlerts.useQuery();
  const { data: alertHistory = [], isLoading: loadingHistory, refetch: refetchHistory } = trpc.modelPerformanceAlerts.getAlertHistory.useQuery({ limit: 50 });
  const { data: stats, isLoading: loadingStats } = trpc.modelPerformanceAlerts.getAlertStats.useQuery();

  const resolveAlertMutation = trpc.modelPerformanceAlerts.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta marcada como resuelta");
      refetchActive();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message || "Error al resolver alerta");
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600">Crítico</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-600">Alto</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">Medio</Badge>;
      case "low":
        return <Badge variant="secondary">Bajo</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const getMetricLabel = (metricName: string) => {
    switch (metricName) {
      case "precision":
        return "Precisión";
      case "recall":
        return "Recall";
      case "f1Score":
        return "F1-Score";
      case "accuracy":
        return "Accuracy";
      default:
        return metricName;
    }
  };

  if (loadingActive || loadingHistory || loadingStats) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de Rendimiento del Modelo Predictivo</h1>
        <p className="text-muted-foreground mt-2">
          Monitoreo automático de métricas del modelo con alertas cuando caen por debajo de umbrales críticos
        </p>
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="text-2xl font-bold">{stats?.active || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="text-2xl font-bold">{stats?.bySeverity.critical || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas por Métrica */}
      {stats && stats.active > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Alertas Activas por Métrica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.byMetric.precision}</div>
                <div className="text-sm text-muted-foreground">Precisión</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.byMetric.recall}</div>
                <div className="text-sm text-muted-foreground">Recall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.byMetric.f1Score}</div>
                <div className="text-sm text-muted-foreground">F1-Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.byMetric.accuracy}</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Alertas */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Alertas Activas ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="history">Historial ({alertHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium">No hay alertas activas</p>
                <p className="text-muted-foreground">Todas las métricas del modelo están dentro de los umbrales aceptables</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert) => (
                <Card key={alert.id} className="border-l-4 border-l-orange-600">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{getMetricLabel(alert.metricName)}</CardTitle>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <CardDescription className="text-sm">
                          {format(new Date(alert.createdAt), "PPP 'a las' HH:mm", { locale: es })}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => resolveAlertMutation.mutate({ alertId: alert.id })}
                        disabled={resolveAlertMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar como Resuelta
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor Actual:</span>{" "}
                        <span className="font-medium text-red-600">{alert.currentValue}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Umbral Crítico:</span>{" "}
                        <span className="font-medium">{alert.thresholdValue}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Mensaje:</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    {alert.recommendation && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        <p className="text-sm font-medium mb-1 text-blue-900 dark:text-blue-100">Recomendación:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{alert.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Alertas</CardTitle>
              <CardDescription>Últimas 50 alertas generadas por el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Umbral</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertHistory.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-sm">
                        {format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{getMetricLabel(alert.metricName)}</TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="font-medium">{alert.currentValue}%</TableCell>
                      <TableCell>{alert.thresholdValue}%</TableCell>
                      <TableCell>
                        {alert.isResolved ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resuelta
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Activa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
