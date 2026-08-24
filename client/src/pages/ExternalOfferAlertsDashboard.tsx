import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp, CheckCircle, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ExternalOfferAlertsDashboard() {
  const {
    data: activeAlerts,
    isLoading,
    refetch,
  } = trpc.externalOfferAlerts.getActiveAlerts.useQuery();
  const { data: stats } = trpc.externalOfferAlerts.getAlertStats.useQuery();
  const { data: byDepartment } =
    trpc.externalOfferAlerts.getAlertsByDepartment.useQuery();

  const resolveAlert = trpc.externalOfferAlerts.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta resuelta exitosamente");
      refetch();
    },
  });

  const dismissAlert = trpc.externalOfferAlerts.dismissAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta descartada");
      refetch();
    },
  });

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleResolve = () => {
    if (!selectedAlert) return;
    resolveAlert.mutate({
      alertId: selectedAlert.id,
      resolutionNotes,
    });
    setSelectedAlert(null);
    setResolutionNotes("");
  };

  const handleDismiss = (alertId: number) => {
    const reason = prompt("Razón para descartar esta alerta:");
    if (reason) {
      dismissAlert.mutate({ alertId, reason });
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de Ofertas Externas</h1>
        <p className="text-muted-foreground">
          Empleados clave en riesgo de recibir ofertas externas
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas Activas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.active_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.critical_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren acción inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.high_alerts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Acción en 30-60 días
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Score Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avg_risk_score
                ? parseFloat(stats.avg_risk_score as string).toFixed(1)
                : "0.0"}
            </div>
            <p className="text-xs text-muted-foreground">De 100 puntos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Alertas Activas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Activas</CardTitle>
          <CardDescription>
            Empleados en riesgo de recibir ofertas externas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando alertas...</p>
          ) : activeAlerts?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay alertas activas
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Brecha Salarial</TableHead>
                  <TableHead>Tiempo Estimado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeAlerts?.map((alert: any) => (
                  <TableRow key={alert.id}>
                    <TableCell className="font-medium">
                      {alert.employeeName}
                    </TableCell>
                    <TableCell>{alert.department}</TableCell>
                    <TableCell>{alert.position}</TableCell>
                    <TableCell>
                      <Badge variant={getRiskBadgeVariant(alert.riskLevel)}>
                        {alert.riskLevel.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {parseFloat(alert.riskScore).toFixed(0)}
                      </span>
                      /100
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          parseFloat(alert.salaryGapPercentage) < -20
                            ? "text-red-600 font-semibold"
                            : ""
                        }
                      >
                        {parseFloat(alert.salaryGapPercentage).toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell>{alert.estimatedTimeToOffer} días</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedAlert(alert)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolver
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Resolver Alerta</DialogTitle>
                              <DialogDescription>
                                {alert.employeeName} - {alert.position}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-semibold mb-2">
                                  Recomendación:
                                </h4>
                                <p className="text-sm">
                                  {alert.recommendedAction}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium">
                                  Notas de Resolución
                                </label>
                                <Textarea
                                  value={resolutionNotes}
                                  onChange={e =>
                                    setResolutionNotes(e.target.value)
                                  }
                                  placeholder="Describe las acciones tomadas..."
                                  className="mt-2"
                                />
                              </div>
                              <Button
                                onClick={handleResolve}
                                className="w-full"
                              >
                                Marcar como Resuelta
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDismiss(alert.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Alertas por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas por Departamento</CardTitle>
          <CardDescription>Distribución de riesgo por área</CardDescription>
        </CardHeader>
        <CardContent>
          {byDepartment?.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay datos disponibles
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Total Alertas</TableHead>
                  <TableHead>Críticas</TableHead>
                  <TableHead>Score Promedio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byDepartment?.map((dept: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {dept.department}
                    </TableCell>
                    <TableCell>{dept.alert_count}</TableCell>
                    <TableCell>
                      {dept.critical_count > 0 && (
                        <Badge variant="destructive">
                          {dept.critical_count}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {parseFloat(dept.avg_risk_score).toFixed(1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
