import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, FileText, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";

export default function EarlyWarnings() {
  const [activeTab, setActiveTab] = useState("summary");

  // Fetch data
  const { data: summary, isLoading: summaryLoading } = trpc.earlyWarnings.getSummary.useQuery();
  const { data: casesData, isLoading: casesLoading } = trpc.earlyWarnings.getCasesAboutToExpire.useQuery();
  const { data: surveysData, isLoading: surveysLoading } = trpc.earlyWarnings.getPendingSurveys.useQuery();
  const { data: actionsData, isLoading: actionsLoading } = trpc.earlyWarnings.getActionsWithoutFollowUp.useQuery();

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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Resumen</TabsTrigger>
          <TabsTrigger value="cases">Casos por Vencer ({casesData?.total || 0})</TabsTrigger>
          <TabsTrigger value="surveys">Encuestas Pendientes ({surveysData?.total || 0})</TabsTrigger>
          <TabsTrigger value="actions">Acciones sin Seguimiento ({actionsData?.total || 0})</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Casos Próximos a Vencer</CardTitle>
              <CardDescription>Casos con menos de 30 días para la fecha límite</CardDescription>
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
                      {casesData?.cases.map((caso) => (
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
                              <Button size="sm" variant="outline">
                                Ver Detalle
                              </Button>
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
                      {surveysData?.surveys.map((survey) => (
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
                              <Button size="sm" variant="outline">
                                Ver Detalle
                              </Button>
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
                      {actionsData?.actions.map((action) => (
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
                              <Button size="sm" variant="outline">
                                Ver Detalle
                              </Button>
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
      </Tabs>
    </div>
  );
}
