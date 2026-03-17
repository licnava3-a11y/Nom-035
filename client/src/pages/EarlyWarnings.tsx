import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import ProtectedButton from "@/components/ProtectedButton";

export default function EarlyWarnings() {
  const [activeTab, setActiveTab] = useState("summary");
  
  // Filter states
  const [department, setDepartment] = useState<string | undefined>(undefined);
  const [priority, setPriority] = useState<"high" | "medium" | "low" | "all">("all");
  const [startDate, setStartDate] = useState<string | undefined>(undefined);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = trpc.earlyWarnings.getSummary.useQuery();
  const { data: casesData, isLoading: casesLoading } = trpc.earlyWarnings.getCasesAboutToExpire.useQuery({
    department,
    priority,
    startDate,
    endDate,
  });
  const { data: surveysData, isLoading: surveysLoading } = trpc.earlyWarnings.getPendingSurveys.useQuery();
  const { data: actionsData, isLoading: actionsLoading } = trpc.earlyWarnings.getActionsWithoutFollowUp.useQuery();
  const { data: coverageData, isLoading: coverageLoading } = trpc.earlyWarnings.getSurveyCoverageAlerts.useQuery();

  const getPriorityBadge = (priority: string, color: string) => {
    const colorClasses = {
      red: "bg-red-100 text-red-800 border-red-300",
      yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
      green: "bg-green-100 text-green-800 border-green-300",
    };

    const priorityLabels = {
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };

    return (
      <Badge variant="outline" className={colorClasses[color as keyof typeof colorClasses]}>
        {priorityLabels[priority as keyof typeof priorityLabels]}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Alertas Tempranas</h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo de casos próximos a vencer, encuestas pendientes y acciones correctivas sin seguimiento
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.totalAlerts || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Alertas activas en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos por Vencer</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.casesAboutToExpire || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Menos de 30 días restantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encuestas Pendientes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.pendingSurveys || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Fecha límite vencida</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acciones sin Seguimiento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryLoading ? "..." : summary?.actionsWithoutFollowUp || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Sin actualización en 30+ días</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="cases">Casos por Vencer ({casesData?.total || 0})</TabsTrigger>
          <TabsTrigger value="surveys">Encuestas Pendientes ({surveysData?.total || 0})</TabsTrigger>
          <TabsTrigger value="actions">Acciones sin Seguimiento ({actionsData?.total || 0})</TabsTrigger>
          <TabsTrigger value="coverage">Cobertura de Encuestas ({coverageData?.totalAlerts || 0})</TabsTrigger>
        </TabsList>

        {/* Summary Tab */}
        <TabsContent value="summary" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cases Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Casos por Vencer</CardTitle>
                <CardDescription>Distribución por prioridad</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alta (≤7 días)</span>
                  <Badge variant="destructive">{casesData?.highPriority || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Media (8-15 días)</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {casesData?.mediumPriority || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Baja (16-30 días)</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {casesData?.lowPriority || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Surveys Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Encuestas Pendientes</CardTitle>
                <CardDescription>Distribución por días vencidos</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alta (&gt;30 días)</span>
                  <Badge variant="destructive">{surveysData?.highPriority || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Media (16-30 días)</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {surveysData?.mediumPriority || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Baja (≤15 días)</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {surveysData?.lowPriority || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Actions Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Acciones sin Seguimiento</CardTitle>
                <CardDescription>Distribución por días sin actualización</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Alta (&gt;60 días)</span>
                  <Badge variant="destructive">{actionsData?.highPriority || 0}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Media (46-60 días)</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    {actionsData?.mediumPriority || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Baja (30-45 días)</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    {actionsData?.lowPriority || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          {/* Filtros Avanzados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filtros Avanzados</CardTitle>
              <CardDescription>Filtre los casos por departamento, prioridad y rango de fechas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Departamento</label>
                  <input
                    type="text"
                    placeholder="Ej: Recursos Humanos"
                    value={department || ""}
                    onChange={(e) => setDepartment(e.target.value || undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="all">Todas</option>
                    <option value="high">Alta (≤7 días)</option>
                    <option value="medium">Media (8-15 días)</option>
                    <option value="low">Baja (16-30 días)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate || ""}
                    onChange={(e) => setStartDate(e.target.value || undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate || ""}
                    onChange={(e) => setEndDate(e.target.value || undefined)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDepartment(undefined);
                    setPriority("all");
                    setStartDate(undefined);
                    setEndDate(undefined);
                  }}
                >
                  Limpiar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Casos Próximos a Vencer</CardTitle>
              <CardDescription>Casos con menos de 30 días para la fecha límite ({casesData?.total || 0} resultados)</CardDescription>
            </CardHeader>
            <CardContent>
              {casesLoading ? (
                <p className="text-center text-muted-foreground py-8">Cargando casos...</p>
              ) : casesData?.cases.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay casos próximos a vencer</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Folio</th>
                        <th className="text-left py-2 px-4">Empleado</th>
                        <th className="text-left py-2 px-4">Departamento</th>
                        <th className="text-left py-2 px-4">Nivel de Riesgo</th>
                        <th className="text-left py-2 px-4">Fecha Límite</th>
                        <th className="text-left py-2 px-4">Días Restantes</th>
                        <th className="text-left py-2 px-4">Prioridad</th>
                        <th className="text-left py-2 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {casesData?.cases.map((caso: any) => (
                        <tr key={caso.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4 font-mono text-sm">{caso.folio}</td>
                          <td className="py-2 px-4">{caso.employeeName}</td>
                          <td className="py-2 px-4">{caso.department || "N/A"}</td>
                          <td className="py-2 px-4">
                            <Badge variant="outline">{caso.riskLevel}</Badge>
                          </td>
                          <td className="py-2 px-4">{new Date(caso.deadline).toLocaleDateString("es-MX")}</td>
                          <td className="py-2 px-4 font-semibold">{caso.daysRemaining} días</td>
                          <td className="py-2 px-4">{getPriorityBadge(caso.priority, caso.priorityColor)}</td>
                          <td className="py-2 px-4">
                            <Link href={`/cases/${caso.id}`}>
                              <ProtectedButton 
                                size="sm" 
                                variant="outline"
                                requiredPermission="can_view"
                                fallbackMessage="No tienes permisos para ver detalles"
                              >
                                Ver Detalle
                              </ProtectedButton>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveys Tab */}
        <TabsContent value="surveys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Encuestas Pendientes de Aplicación</CardTitle>
              <CardDescription>Encuestas activas con fecha límite vencida</CardDescription>
            </CardHeader>
            <CardContent>
              {surveysLoading ? (
                <p className="text-center text-muted-foreground py-8">Cargando encuestas...</p>
              ) : surveysData?.surveys.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">No hay encuestas pendientes</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Título</th>
                        <th className="text-left py-2 px-4">Tipo</th>
                        <th className="text-left py-2 px-4">Fecha Límite</th>
                        <th className="text-left py-2 px-4">Días Vencidos</th>
                        <th className="text-left py-2 px-4">Tasa de Completado</th>
                        <th className="text-left py-2 px-4">Prioridad</th>
                        <th className="text-left py-2 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveysData?.surveys.map((survey: any) => (
                        <tr key={survey.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{survey.title}</td>
                          <td className="py-2 px-4">
                            <Badge variant="outline">{survey.type}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            {survey.endDate ? new Date(survey.endDate).toLocaleDateString("es-MX") : "N/A"}
                          </td>
                          <td className="py-2 px-4 font-semibold text-red-600">{survey.daysOverdue} días</td>
                          <td className="py-2 px-4">{survey.completionRate.toFixed(1)}%</td>
                          <td className="py-2 px-4">{getPriorityBadge(survey.priority, survey.priorityColor)}</td>
                          <td className="py-2 px-4">
                            <Link href={`/surveys/${survey.id}`}>
                              <ProtectedButton 
                                size="sm" 
                                variant="outline"
                                requiredPermission="can_view"
                                fallbackMessage="No tienes permisos para ver detalles"
                              >
                                Ver Detalle
                              </ProtectedButton>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Acciones Correctivas sin Seguimiento</CardTitle>
              <CardDescription>Acciones sin actualización en los últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent>
              {actionsLoading ? (
                <p className="text-center text-muted-foreground py-8">Cargando acciones...</p>
              ) : actionsData?.actions.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">Todas las acciones tienen seguimiento actualizado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-4">Título</th>
                        <th className="text-left py-2 px-4">Responsable</th>
                        <th className="text-left py-2 px-4">Departamento</th>
                        <th className="text-left py-2 px-4">Estado</th>
                        <th className="text-left py-2 px-4">Última Actualización</th>
                        <th className="text-left py-2 px-4">Días sin Actualización</th>
                        <th className="text-left py-2 px-4">Prioridad</th>
                        <th className="text-left py-2 px-4">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionsData?.actions.map((action: any) => (
                        <tr key={action.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{action.title || action.description.substring(0, 50) + "..."}</td>
                          <td className="py-2 px-4">{action.assignedTo || "Sin asignar"}</td>
                          <td className="py-2 px-4">{action.department || "N/A"}</td>
                          <td className="py-2 px-4">
                            <Badge variant="outline">{action.status}</Badge>
                          </td>
                          <td className="py-2 px-4">
                            {new Date(action.lastUpdated).toLocaleDateString("es-MX")}
                          </td>
                          <td className="py-2 px-4 font-semibold text-orange-600">{action.daysSinceUpdate} días</td>
                          <td className="py-2 px-4">{getPriorityBadge(action.alertPriority, action.priorityColor)}</td>
                          <td className="py-2 px-4">
                            <Link href={`/surveys/corrective-actions`}>
                              <ProtectedButton 
                                size="sm" 
                                variant="outline"
                                requiredPermission="can_view"
                                fallbackMessage="No tienes permisos para ver detalles"
                              >
                                Ver Detalle
                              </ProtectedButton>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cobertura de Encuestas NOM-035</CardTitle>
              <CardDescription>
                Encuestas con cobertura menor al 80% requerido por la norma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {coverageLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando datos de cobertura...</div>
              ) : !coverageData?.alerts || coverageData.alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-muted-foreground">Todas las encuestas cumplen con el umbral mínimo de cobertura (80%)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {coverageData.alerts.map((alert: any) => (
                    <div
                      key={alert.surveyId}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{alert.surveyTitle}</h3>
                          {getPriorityBadge(alert.priority, alert.priorityColor)}
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <span className="font-medium">Tipo:</span> {alert.surveyType.toUpperCase()}
                          </p>
                          <p>
                            <span className="font-medium">Cobertura actual:</span>{" "}
                            <span className={alert.coverage < 50 ? "text-red-600 font-semibold" : alert.coverage < 65 ? "text-yellow-600 font-semibold" : "text-green-600 font-semibold"}>
                              {alert.coverage.toFixed(2)}%
                            </span>
                          </p>
                          <p>
                            <span className="font-medium">Encuestas completadas:</span> {alert.completedSurveys} de {alert.totalWorkers} trabajadores
                          </p>
                          <p>
                            <span className="font-medium">Brecha:</span>{" "}
                            <span className="text-red-600 font-semibold">{alert.gap.toFixed(2)}%</span> por debajo del umbral mínimo ({alert.threshold}%)
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                          <Link href={`/surveys/${alert.surveyId}`}>
                            <ProtectedButton 
                              variant="outline" 
                              size="sm"
                              requiredPermission="can_view"
                              fallbackMessage="No tienes permisos para ver encuestas"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Ver Encuesta
                            </ProtectedButton>
                          </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
