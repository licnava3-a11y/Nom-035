/**
 * Panel de Configuración de Reportes Ejecutivos
 * Permite configurar frecuencia, destinatarios y opciones de reportes automatizados
 * Sprint 44: Agrega botón "Vista Previa" que muestra KPIs actuales antes de enviar
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Pencil, Trash2, Power, PowerOff, Calendar, Mail, Settings, Eye, Users, BookOpen, Briefcase, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type ReportConfig = {
  id: number;
  reportType: string;
  frequency: string;
  customSchedule: string | null;
  recipients: string;
  ccRecipients: string | null;
  enabled: boolean;
  includeCharts: boolean;
  includeTrends: boolean;
  includeRecommendations: boolean;
  departmentIds: string | null;
  dateRangeType: string;
  lastExecutedAt: Date | null;
  nextExecutionAt: Date | null;
  executionCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: number;
};

export default function ReportConfigurationPanel() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReportConfig | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewConfig, setPreviewConfig] = useState<ReportConfig | null>(null);

  // Form state
  const [reportType, setReportType] = useState("executive_weekly");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "quarterly" | "custom">("weekly");
  const [customSchedule, setCustomSchedule] = useState("");
  const [recipients, setRecipients] = useState("");
  const [ccRecipients, setCcRecipients] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeTrends, setIncludeTrends] = useState(true);
  const [includeRecommendations, setIncludeRecommendations] = useState(true);
  const [dateRangeType, setDateRangeType] = useState<"auto" | "custom" | "last_7_days" | "last_30_days">("auto");

  // Queries
  const { data: configs, isLoading, refetch } = trpc.reportConfigurations.getAll.useQuery();

  // KPIs para preview — se cargan solo cuando se abre el modal
  const { data: kpiData, isLoading: kpiLoading } = trpc.executiveReport.getKPIs.useQuery(
    {},
    { enabled: isPreviewOpen }
  );

  // Mutations
  const createMutation = trpc.reportConfigurations.create.useMutation({
    onSuccess: () => {
      toast.success("Configuración de reporte creada exitosamente");
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error al crear configuración: ${error.message}`);
    },
  });

  const updateMutation = trpc.reportConfigurations.update.useMutation({
    onSuccess: () => {
      toast.success("Configuración actualizada exitosamente");
      refetch();
      setIsEditDialogOpen(false);
      setSelectedConfig(null);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error al actualizar configuración: ${error.message}`);
    },
  });

  const deleteMutation = trpc.reportConfigurations.delete.useMutation({
    onSuccess: () => {
      toast.success("Configuración eliminada exitosamente");
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedConfig(null);
    },
    onError: (error) => {
      toast.error(`Error al eliminar configuración: ${error.message}`);
    },
  });

  const toggleEnabledMutation = trpc.reportConfigurations.toggleEnabled.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setReportType("executive_weekly");
    setFrequency("weekly");
    setCustomSchedule("");
    setRecipients("");
    setCcRecipients("");
    setEnabled(true);
    setIncludeCharts(true);
    setIncludeTrends(true);
    setIncludeRecommendations(true);
    setDateRangeType("auto");
  };

  const handleCreate = () => {
    const recipientsList = recipients.split(",").map((r: any) => r.trim()).filter((r: any) => r);
    const ccRecipientsList = ccRecipients ? ccRecipients.split(",").map((r: any) => r.trim()).filter((r: any) => r) : [];

    createMutation.mutate({
      reportType,
      frequency,
      customSchedule: frequency === "custom" ? customSchedule : undefined,
      recipients: recipientsList,
      ccRecipients: ccRecipientsList.length > 0 ? ccRecipientsList : undefined,
      enabled,
      includeCharts,
      includeTrends,
      includeRecommendations,
      dateRangeType,
    });
  };

  const handleEdit = () => {
    if (!selectedConfig) return;

    const recipientsList = recipients.split(",").map((r: any) => r.trim()).filter((r: any) => r);
    const ccRecipientsList = ccRecipients ? ccRecipients.split(",").map((r: any) => r.trim()).filter((r: any) => r) : [];

    updateMutation.mutate({
      id: selectedConfig.id,
      reportType,
      frequency,
      customSchedule: frequency === "custom" ? customSchedule : undefined,
      recipients: recipientsList,
      ccRecipients: ccRecipientsList.length > 0 ? ccRecipientsList : undefined,
      enabled,
      includeCharts,
      includeTrends,
      includeRecommendations,
      dateRangeType,
    });
  };

  const openEditDialog = (config: ReportConfig) => {
    setSelectedConfig(config);
    setReportType(config.reportType);
    setFrequency(config.frequency as any);
    setCustomSchedule(config.customSchedule || "");
    setRecipients(JSON.parse(config.recipients).join(", "));
    setCcRecipients(config.ccRecipients ? JSON.parse(config.ccRecipients).join(", ") : "");
    setEnabled(config.enabled);
    setIncludeCharts(config.includeCharts);
    setIncludeTrends(config.includeTrends);
    setIncludeRecommendations(config.includeRecommendations);
    setDateRangeType(config.dateRangeType as any);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (config: ReportConfig) => {
    setSelectedConfig(config);
    setIsDeleteDialogOpen(true);
  };

  const openPreviewDialog = (config: ReportConfig) => {
    setPreviewConfig(config);
    setIsPreviewOpen(true);
  };

  const handleToggleEnabled = (config: ReportConfig) => {
    toggleEnabledMutation.mutate({
      id: config.id,
      enabled: !config.enabled,
    });
  };

  const getFrequencyBadge = (freq: string) => {
    const colors: Record<string, string> = {
      weekly: "bg-blue-100 text-blue-800",
      monthly: "bg-green-100 text-green-800",
      quarterly: "bg-purple-100 text-purple-800",
      custom: "bg-orange-100 text-orange-800",
    };
    return <Badge className={colors[freq] || ""}>{freq}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando configuraciones...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Configuración de Reportes Ejecutivos</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona la frecuencia, destinatarios y opciones de reportes automatizados
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Configuración
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Configuraciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {configs?.filter((c: any) => c.enabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Deshabilitadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {configs?.filter((c: any) => !c.enabled).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Ejecuciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configs?.reduce((sum: any, c: any) => sum + c.executionCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Configuraciones de Reportes</CardTitle>
          <CardDescription>
            Lista de todas las configuraciones de reportes automatizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!configs || configs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay configuraciones de reportes</p>
              <p className="text-sm mt-2">Crea una nueva configuración para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo de Reporte</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Próxima Ejecución</TableHead>
                  <TableHead>Ejecuciones</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config: any) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.reportType}</TableCell>
                    <TableCell>{getFrequencyBadge(config.frequency)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {JSON.parse(config.recipients).length} destinatarios
                      </div>
                    </TableCell>
                    <TableCell>
                      {config.nextExecutionAt ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(config.nextExecutionAt).toLocaleDateString("es-MX")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{config.executionCount}</TableCell>
                    <TableCell>
                      {config.enabled ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Deshabilitado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreviewDialog(config)}
                          title="Vista previa del reporte"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleEnabled(config)}
                        >
                          {config.enabled ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(config)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteDialog(config)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* ===== PREVIEW DIALOG ===== */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Vista Previa — {previewConfig?.reportType}
            </DialogTitle>
            <DialogDescription>
              Resumen de KPIs actuales que se incluirán en el próximo envío del reporte
              <span className="block text-xs mt-1 text-muted-foreground">
                Generado: {new Date().toLocaleString("es-MX")}
              </span>
            </DialogDescription>
          </DialogHeader>

          {kpiLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-muted-foreground text-sm">Cargando datos del reporte...</div>
            </div>
          ) : kpiData ? (
            <div className="space-y-4 py-2">
              {/* Empleados */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-base">Empleados</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="text-2xl font-bold">{kpiData.employees.total}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-700">{kpiData.employees.active}</div>
                    <div className="text-xs text-muted-foreground">Activos</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-700">{kpiData.employees.inactive}</div>
                    <div className="text-xs text-muted-foreground">Bajas</div>
                  </div>
                  <div className="text-center p-2 bg-orange-50 rounded">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-2xl font-bold text-orange-700">{kpiData.employees.turnoverRate}%</span>
                      {kpiData.employees.turnoverChange > 0
                        ? <TrendingUp className="h-4 w-4 text-red-500" />
                        : <TrendingDown className="h-4 w-4 text-green-500" />
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">Rotación</div>
                  </div>
                </div>
              </div>

              {/* Capacitación */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-indigo-600" />
                  <h3 className="font-semibold text-base">Capacitación</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="text-2xl font-bold">{kpiData.training.totalCourses}</div>
                    <div className="text-xs text-muted-foreground">Cursos</div>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="text-2xl font-bold">{kpiData.training.totalAssignments}</div>
                    <div className="text-xs text-muted-foreground">Asignaciones</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-700">{kpiData.training.completedAssignments}</div>
                    <div className="text-xs text-muted-foreground">Completadas</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-700">{kpiData.training.completionRate}%</div>
                    <div className="text-xs text-muted-foreground">Tasa completitud</div>
                  </div>
                </div>
              </div>

              {/* Casos y Riesgos */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-base">Casos y Riesgos Psicosociales</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="text-2xl font-bold">{kpiData.cases.total}</div>
                    <div className="text-xs text-muted-foreground">Total casos</div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded">
                    <div className="text-2xl font-bold text-amber-700">{kpiData.cases.open}</div>
                    <div className="text-xs text-muted-foreground">Abiertos</div>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <div className="text-2xl font-bold text-red-700">{kpiData.cases.highRisk}</div>
                    <div className="text-xs text-muted-foreground">Alto riesgo</div>
                  </div>
                  <div className="text-center p-2 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-700">{kpiData.psychometric.highRisk}</div>
                    <div className="text-xs text-muted-foreground">Riesgo psicométrico</div>
                  </div>
                </div>
              </div>

              {/* Vacaciones y Buzón */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="h-5 w-5 text-teal-600" />
                  <h3 className="font-semibold text-base">Vacaciones y Comunicación</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="text-2xl font-bold">{kpiData.vacations.total}</div>
                    <div className="text-xs text-muted-foreground">Solicitudes vacaciones</div>
                  </div>
                  <div className="text-center p-2 bg-amber-50 rounded">
                    <div className="text-2xl font-bold text-amber-700">{kpiData.vacations.pending}</div>
                    <div className="text-xs text-muted-foreground">Pendientes aprobación</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-700">{kpiData.vacations.approved}</div>
                    <div className="text-xs text-muted-foreground">Aprobadas</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-700">{kpiData.mailbox.pending}</div>
                    <div className="text-xs text-muted-foreground">Mensajes pendientes</div>
                  </div>
                </div>
              </div>

              {/* Configuración del reporte */}
              {previewConfig && (
                <div className="border border-dashed rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground">Configuración del Reporte</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Frecuencia:</span> <span className="font-medium">{previewConfig.frequency}</span></div>
                    <div><span className="text-muted-foreground">Rango de fechas:</span> <span className="font-medium">{previewConfig.dateRangeType}</span></div>
                    <div><span className="text-muted-foreground">Destinatarios:</span> <span className="font-medium">{JSON.parse(previewConfig.recipients).length}</span></div>
                    <div>
                      <span className="text-muted-foreground">Incluye: </span>
                      <span className="font-medium">
                        {[
                          previewConfig.includeCharts && "Gráficos",
                          previewConfig.includeTrends && "Tendencias",
                          previewConfig.includeRecommendations && "Recomendaciones",
                        ].filter(Boolean).join(", ") || "Solo datos"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se pudieron cargar los datos del reporte
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
            {previewConfig && (
              <Button
                variant="default"
                onClick={() => {
                  openEditDialog(previewConfig);
                  setIsPreviewOpen(false);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Editar Configuración
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Configuración de Reporte</DialogTitle>
            <DialogDescription>
              Configura un nuevo reporte ejecutivo automatizado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reportType">Tipo de Reporte</Label>
              <Input
                id="reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                placeholder="executive_weekly"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="customSchedule">Cron Expression</Label>
                <Input
                  id="customSchedule"
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value)}
                  placeholder="0 0 8 * * 1"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="recipients">Destinatarios (separados por comas)</Label>
              <Input
                id="recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder="email1@example.com, email2@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ccRecipients">CC (opcional, separados por comas)</Label>
              <Input
                id="ccRecipients"
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
                placeholder="cc1@example.com, cc2@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateRangeType">Rango de Fechas</Label>
              <Select value={dateRangeType} onValueChange={(v: any) => setDateRangeType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="last_7_days">Últimos 7 días</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Habilitado</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} id="enabled" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeCharts">Incluir Gráficos</Label>
                <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} id="includeCharts" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeTrends">Incluir Tendencias</Label>
                <Switch checked={includeTrends} onCheckedChange={setIncludeTrends} id="includeTrends" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeRecommendations">Incluir Recomendaciones</Label>
                <Switch checked={includeRecommendations} onCheckedChange={setIncludeRecommendations} id="includeRecommendations" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleCreate}
              loading={createMutation.isPending}
            >
              Crear Configuración
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Configuración de Reporte</DialogTitle>
            <DialogDescription>
              Modifica la configuración del reporte ejecutivo
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-reportType">Tipo de Reporte</Label>
              <Input
                id="edit-reportType"
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-frequency">Frecuencia</Label>
              <Select value={frequency} onValueChange={(v: any) => setFrequency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "custom" && (
              <div className="grid gap-2">
                <Label htmlFor="edit-customSchedule">Cron Expression</Label>
                <Input
                  id="edit-customSchedule"
                  value={customSchedule}
                  onChange={(e) => setCustomSchedule(e.target.value)}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-recipients">Destinatarios</Label>
              <Input
                id="edit-recipients"
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-ccRecipients">CC (opcional)</Label>
              <Input
                id="edit-ccRecipients"
                value={ccRecipients}
                onChange={(e) => setCcRecipients(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-dateRangeType">Rango de Fechas</Label>
              <Select value={dateRangeType} onValueChange={(v: any) => setDateRangeType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Automático</SelectItem>
                  <SelectItem value="last_7_days">Últimos 7 días</SelectItem>
                  <SelectItem value="last_30_days">Últimos 30 días</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-enabled">Habilitado</Label>
                <Switch checked={enabled} onCheckedChange={setEnabled} id="edit-enabled" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-includeCharts">Incluir Gráficos</Label>
                <Switch checked={includeCharts} onCheckedChange={setIncludeCharts} id="edit-includeCharts" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-includeTrends">Incluir Tendencias</Label>
                <Switch checked={includeTrends} onCheckedChange={setIncludeTrends} id="edit-includeTrends" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="edit-includeRecommendations">Incluir Recomendaciones</Label>
                <Switch checked={includeRecommendations} onCheckedChange={setIncludeRecommendations} id="edit-includeRecommendations" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              onClick={handleEdit}
              loading={updateMutation.isPending}
            >
              Guardar Cambios
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta configuración de reporte?
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton
              variant="destructive"
              onClick={() => selectedConfig && deleteMutation.mutate({ id: selectedConfig.id })}
              loading={deleteMutation.isPending}
            >
              Eliminar
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
