import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Loader2, AlertTriangle, Bell, Settings, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

export default function RiskAlerts() {
  const [thresholdPercentage, setThresholdPercentage] = useState(30);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(null);

  // Queries
  const { data: thresholds, isLoading: thresholdsLoading } = trpc.riskAlerts.getThresholds.useQuery();
  const { data: alertHistory, isLoading: historyLoading } = trpc.riskAlerts.getAlertHistory.useQuery({
    limit: 50,
  });
  const { data: departmentStats, isLoading: statsLoading } = trpc.riskAlerts.getDepartmentRiskStats.useQuery();

  // Mutations
  const checkRiskLevelsMutation = trpc.riskAlerts.checkRiskLevels.useMutation({
    onSuccess: (data) => {
      if (data.alertsTriggered > 0) {
        toast.success(`${data.alertsTriggered} alertas generadas`);
      } else {
        toast.info("No se generaron alertas. Todos los departamentos están dentro de los umbrales.");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const configureThresholdsMutation = trpc.riskAlerts.configureThresholds.useMutation({
    onSuccess: () => {
      toast.success("Umbrales configurados exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const triggerAlertMutation = trpc.riskAlerts.triggerAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta manual enviada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Render Department Risk Stats
  const renderDepartmentStats = () => {
    if (!departmentStats) return null;

    return (
      <div className="space-y-4">
        {departmentStats.map((dept: any) => {
          const riskPercentage = (dept.highRiskCount / dept.totalEmployees) * 100;
          const isOverThreshold = riskPercentage > ((thresholds as any)?.highRiskThreshold || 30);

          return (
            <Card key={dept.departmentId} className={isOverThreshold ? "border-red-500 border-2" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{dept.departmentName}</CardTitle>
                  {isOverThreshold && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Alerta Activa
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Empleados</p>
                    <p className="text-2xl font-bold">{dept.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Riesgo Alto</p>
                    <p className="text-2xl font-bold text-red-600">{dept.highRiskCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Riesgo Medio</p>
                    <p className="text-2xl font-bold text-yellow-600">{dept.mediumRiskCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">% Riesgo Alto</p>
                    <p className={`text-2xl font-bold ${isOverThreshold ? "text-red-600" : "text-green-600"}`}>
                      {riskPercentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        isOverThreshold ? "bg-red-600" : "bg-green-600"
                      }`}
                      style={{ width: `${Math.min(riskPercentage, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Umbral configurado: {(thresholds as any)?.highRiskThreshold || 30}%
                  </p>
                </div>
                {isOverThreshold && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      triggerAlertMutation.mutate({
                        departmentId: dept.departmentId,
                        // alertType: "high_risk_threshold",
                        message: `Departamento ${dept.departmentName} superó el umbral de riesgo alto (${riskPercentage.toFixed(1)}%)`,
                      });
                    }}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Enviar Alerta Manual
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Render Alert History
  const renderAlertHistory = () => {
    if (!alertHistory) return null;

    return (
      <div className="space-y-3">
        {alertHistory.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay alertas registradas</p>
        ) : (
          (alertHistory as any[]).map((alert: any) => (
            <Card key={alert.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                        {alert.alertType}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.createdAt).toLocaleString("es-MX")}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    {alert.departmentName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Departamento: {alert.departmentName}
                      </p>
                    )}
                  </div>
                  {alert.notificationSent && (
                    <Badge variant="outline" className="ml-4">
                      <Bell className="h-3 w-3 mr-1" />
                      Notificado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  if (thresholdsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Alertas Tempranas</h1>
          <p className="text-muted-foreground">
            Monitoreo automático de umbrales de riesgo psicosocial por departamento
          </p>
        </div>
        <Button
          onClick={() => checkRiskLevelsMutation.mutate({})}
          disabled={checkRiskLevelsMutation.isPending}
        >
          {checkRiskLevelsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <AlertTriangle className="mr-2 h-4 w-4" />
          Verificar Umbrales Ahora
        </Button>
      </div>

      {/* Configuración de Umbrales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración de Umbrales
          </CardTitle>
          <CardDescription>
            Define los porcentajes de riesgo que disparan alertas automáticas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="highRiskThreshold">Umbral Riesgo Alto (%)</Label>
              <Input
                id="highRiskThreshold"
                type="number"
                min="0"
                max="100"
                defaultValue={(thresholds as any)?.highRiskThreshold || 30}
                onChange={(e) => setThresholdPercentage(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Actual: {(thresholds as any)?.highRiskThreshold || 30}%
              </p>
            </div>
            <div>
              <Label htmlFor="mediumRiskThreshold">Umbral Riesgo Medio (%)</Label>
              <Input
                id="mediumRiskThreshold"
                type="number"
                min="0"
                max="100"
                defaultValue={(thresholds as any)?.mediumRiskThreshold || 20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Actual: {(thresholds as any)?.mediumRiskThreshold || 20}%
              </p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  const highRisk = parseInt(
                    (document.getElementById("highRiskThreshold") as HTMLInputElement).value
                  );
                  const mediumRisk = parseInt(
                    (document.getElementById("mediumRiskThreshold") as HTMLInputElement).value
                  );
                  configureThresholdsMutation.mutate({
                    highRiskThreshold: highRisk,
                    mediumRiskThreshold: mediumRisk,
                  });
                }}
                disabled={configureThresholdsMutation.isPending}
              >
                {configureThresholdsMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Guardar Configuración
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Visualización */}
      <Tabs defaultValue="stats" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stats">Estadísticas por Departamento</TabsTrigger>
          <TabsTrigger value="history">Historial de Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="stats" className="space-y-4">
          {statsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            renderDepartmentStats()
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Alertas</CardTitle>
              <CardDescription>Últimas 50 alertas generadas por el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderAlertHistory()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
