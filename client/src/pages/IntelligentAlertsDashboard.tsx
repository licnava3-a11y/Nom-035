import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  XCircle,
  Brain,
  Lightbulb,
  Clock,
  User
} from "lucide-react";
import { toast } from "sonner";

export default function IntelligentAlertsDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [dismissReason, setDismissReason] = useState("");

  const utils = trpc.useUtils();

  // Queries
  const { data: dashboard, isLoading: loadingDashboard } = trpc.intelligentAlerts.getDashboard.useQuery();
  const { data: alerts, isLoading: loadingAlerts } = trpc.intelligentAlerts.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    severity: severityFilter !== "all" ? (severityFilter as any) : undefined,
  });

  // Mutations
  const runAnalysis = trpc.intelligentAlerts.runPredictiveAnalysis.useMutation({
    onSuccess: (data) => {
      toast.success(`Análisis completado: ${data.alertsGenerated} alertas generadas`);
      utils.intelligentAlerts.list.invalidate();
      utils.intelligentAlerts.getDashboard.invalidate();
    },
    onError: () => {
      toast.error("Error al ejecutar análisis predictivo");
    },
  });

  const resolveAlert = trpc.intelligentAlerts.resolve.useMutation({
    onSuccess: () => {
      toast.success("Alerta marcada como resuelta");
      utils.intelligentAlerts.list.invalidate();
      utils.intelligentAlerts.getDashboard.invalidate();
      setSelectedAlert(null);
      setResolutionNotes("");
    },
    onError: () => {
      toast.error("Error al resolver alerta");
    },
  });

  const dismissAlert = trpc.intelligentAlerts.dismiss.useMutation({
    onSuccess: () => {
      toast.success("Alerta descartada");
      utils.intelligentAlerts.list.invalidate();
      utils.intelligentAlerts.getDashboard.invalidate();
      setSelectedAlert(null);
      setDismissReason("");
    },
    onError: () => {
      toast.error("Error al descartar alerta");
    },
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      case "low":
        return "outline";
      default:
        return "outline";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
      case "high":
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "medium":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "low":
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      case_surge: "Aumento de Casos",
      training_satisfaction_drop: "Caída en Satisfacción",
      pending_recommendations: "Recomendaciones Pendientes",
      department_risk: "Riesgo Departamental",
      compliance_issue: "Problema de Cumplimiento",
      other: "Otro",
    };
    return labels[type] || type;
  };

  if (loadingDashboard) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-500" />
            Alertas Inteligentes con IA
          </h1>
          <p className="text-muted-foreground mt-2">
            Detección proactiva de patrones de riesgo emergentes
          </p>
        </div>
        <Button onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>
          {runAnalysis.isPending ? "Analizando..." : "Ejecutar Análisis"}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Activas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.activeCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requieren atención inmediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboard?.criticalCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Severidad crítica
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Resueltas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.resolvedCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Casos cerrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Resolución</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.resolutionRate || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Efectividad del equipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas Críticas */}
      {dashboard?.criticalAlerts && dashboard.criticalAlerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              Alertas Críticas Activas
            </CardTitle>
            <CardDescription>
              Requieren atención inmediata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.criticalAlerts.map((item: any) => (
                <div key={item.alert.id} className="flex items-start justify-between p-4 bg-white border border-red-200 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(item.alert.severity)}
                      <p className="font-medium">{item.alert.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.alert.createdAt ? new Date(item.alert.createdAt).toLocaleDateString() : "N/A"}
                      </span>
                      {item.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.assignedUser.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => setSelectedAlert(item.alert)}>
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>{item.alert.title}</DialogTitle>
                        <DialogDescription>{item.alert.description}</DialogDescription>
                      </DialogHeader>
                      <AlertDetailsContent alert={item.alert} />
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="resolved">Resueltas</SelectItem>
                  <SelectItem value="dismissed">Descartadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Severidad</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Alertas</CardTitle>
          <CardDescription>
            {alerts?.length || 0} alertas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAlerts ? (
            <div className="text-center py-8 text-muted-foreground">Cargando alertas...</div>
          ) : alerts && alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((item: any) => (
                <div key={item.alert.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(item.alert.severity)}
                      <p className="font-medium">{item.alert.title}</p>
                      <Badge variant={getSeverityColor(item.alert.severity) as any}>
                        {item.alert.severity}
                      </Badge>
                      <Badge variant="outline">{getAlertTypeLabel(item.alert.alertType)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.alert.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.alert.createdAt ? new Date(item.alert.createdAt).toLocaleDateString() : "N/A"}
                      </span>
                      {item.assignedUser && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {item.assignedUser.name}
                        </span>
                      )}
                      <Badge variant={item.alert.status === "active" ? "default" : "secondary"}>
                        {item.alert.status}
                      </Badge>
                    </div>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" onClick={() => setSelectedAlert(item.alert)}>
                        Ver Detalles
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getSeverityIcon(item.alert.severity)}
                          {item.alert.title}
                        </DialogTitle>
                        <DialogDescription>{item.alert.description}</DialogDescription>
                      </DialogHeader>
                      
                      {/* Contexto */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">Contexto</h4>
                          <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                            {JSON.stringify(item.alert.context, null, 2)}
                          </pre>
                        </div>

                        {/* Sugerencias de IA */}
                        {(item.alert.suggestions as any)?.suggestions && (item.alert.suggestions as any).suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-yellow-500" />
                              Sugerencias de Intervención (IA)
                            </h4>
                            <div className="space-y-3">
                                   {(item.alert.suggestions as any).suggestions.map((suggestion: any, index: number) => (
                                <div key={index} className="border rounded-lg p-3">
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-medium">{suggestion.title}</p>
                                    <Badge variant={suggestion.priority === "high" ? "destructive" : suggestion.priority === "medium" ? "default" : "secondary"}>
                                      {suggestion.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    <strong>Impacto esperado:</strong> {suggestion.estimatedImpact}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Acciones */}
                        {item.alert.status === "active" && (
                          <div className="flex gap-2 pt-4 border-t">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button className="flex-1">Marcar como Resuelta</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Marcar como Resuelta</DialogTitle>
                                  <DialogDescription>
                                    Proporciona notas sobre cómo se resolvió esta alerta
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Notas de Resolución</Label>
                                    <Textarea
                                      value={resolutionNotes}
                                      onChange={(e) => setResolutionNotes(e.target.value)}
                                      placeholder="Describe las acciones tomadas..."
                                      rows={4}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => resolveAlert.mutate({ id: item.alert.id, resolutionNotes })}
                                    disabled={!resolutionNotes || resolveAlert.isPending}
                                    className="w-full"
                                  >
                                    {resolveAlert.isPending ? "Guardando..." : "Confirmar Resolución"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="flex-1">Descartar</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Descartar Alerta</DialogTitle>
                                  <DialogDescription>
                                    Explica por qué esta alerta no requiere acción
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Razón</Label>
                                    <Textarea
                                      value={dismissReason}
                                      onChange={(e) => setDismissReason(e.target.value)}
                                      placeholder="Explica por qué se descarta..."
                                      rows={4}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => dismissAlert.mutate({ id: item.alert.id, reason: dismissReason })}
                                    disabled={!dismissReason || dismissAlert.isPending}
                                    variant="destructive"
                                    className="w-full"
                                  >
                                    {dismissAlert.isPending ? "Guardando..." : "Confirmar Descarte"}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No hay alertas</p>
              <p className="text-sm text-muted-foreground mt-2">
                Ejecuta un análisis predictivo para generar alertas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AlertDetailsContent({ alert }: { alert: any }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Contexto</h4>
        <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
          {JSON.stringify(alert.context, null, 2)}
        </pre>
      </div>

                      {(alert.suggestions as any)?.suggestions && (alert.suggestions as any).suggestions.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Sugerencias de Intervención (IA)
          </h4>
          <div className="space-y-3">
                            {(alert.suggestions as any).suggestions.map((suggestion: any, index: number) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-medium">{suggestion.title}</p>
                  <Badge variant={suggestion.priority === "high" ? "destructive" : suggestion.priority === "medium" ? "default" : "secondary"}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                <p className="text-xs text-muted-foreground">
                  <strong>Impacto esperado:</strong> {suggestion.estimatedImpact}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
