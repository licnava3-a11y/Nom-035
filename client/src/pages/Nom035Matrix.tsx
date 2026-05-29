/**
 * Nom035Matrix.tsx
 * Página principal del módulo de Matriz de Acciones con Evidencias NOM-035.
 * Muestra planes, acciones con estado, evidencias y permite gestión completa.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import {
  Plus, Search, Filter, FileText, CheckCircle2, Clock, AlertTriangle,
  XCircle, ChevronDown, ChevronRight, Paperclip, Download, Trash2,
  RefreshCw, BarChart3, Eye, Edit2, Loader2, Building2, Users, User
} from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  no_iniciada: { label: "No iniciada", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300", icon: <Clock className="h-3 w-3" /> },
  en_proceso: { label: "En proceso", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", icon: <RefreshCw className="h-3 w-3" /> },
  cumplida: { label: "Cumplida", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", icon: <CheckCircle2 className="h-3 w-3" /> },
  vencida: { label: "Vencida", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300", icon: <AlertTriangle className="h-3 w-3" /> },
  cancelada: { label: "Cancelada", color: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 line-through", icon: <XCircle className="h-3 w-3" /> },
};

const PRIORIDAD_CONFIG: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  media: { label: "Media", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300" },
  baja: { label: "Baja", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
};

const TIPO_PLAN_LABELS: Record<string, string> = {
  intervencion: "Intervención",
  violencia_laboral: "Violencia Laboral",
  no_discriminacion: "No Discriminación",
  consolidado: "Consolidado",
};

const NIVEL_ICON: Record<string, React.ReactNode> = {
  organizacional: <Building2 className="h-4 w-4" />,
  grupal: <Users className="h-4 w-4" />,
  individual: <User className="h-4 w-4" />,
};

// ── Componente de fila de acción ──────────────────────────────────────────────

function ActionRow({
  action,
  onUpdateStatus,
  onViewEvidences,
  onUploadEvidence,
}: {
  action: any;
  onUpdateStatus: (id: number, estado: string) => void;
  onViewEvidences: (action: any) => void;
  onUploadEvidence: (action: any) => void;
}) {
  const estadoConf = ESTADO_CONFIG[action.estado] || ESTADO_CONFIG.no_iniciada;
  const prioridadConf = PRIORIDAD_CONFIG[action.prioridad] || PRIORIDAD_CONFIG.media;
  const isVencida = action.plazo && new Date(action.plazo) < new Date() && action.estado !== "cumplida";

  return (
    <TableRow className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <TableCell className="font-mono text-xs font-bold text-gray-500 w-20">{action.accionId}</TableCell>
      <TableCell className="max-w-xs">
        <p className="text-sm font-medium leading-tight line-clamp-2">{action.objetivo}</p>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{action.accion}</p>
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${estadoConf.color}`}>
          {estadoConf.icon}
          {estadoConf.label}
        </span>
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${prioridadConf.color}`}>
          {prioridadConf.label}
        </span>
      </TableCell>
      <TableCell className="text-sm text-gray-600 dark:text-gray-400">
        {action.responsable || <span className="text-gray-400 italic">Sin asignar</span>}
      </TableCell>
      <TableCell>
        {action.plazo ? (
          <span className={`text-xs ${isVencida ? "text-red-600 font-semibold" : "text-gray-600 dark:text-gray-400"}`}>
            {new Date(action.plazo).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" })}
            {isVencida && " ⚠️"}
          </span>
        ) : (
          <span className="text-gray-400 text-xs italic">Sin plazo</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onViewEvidences(action)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Paperclip className="h-3 w-3" />
                  {action.evidencias?.length ?? 0}
                </button>
              </TooltipTrigger>
              <TooltipContent>Ver evidencias</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onUploadEvidence(action)}
                  className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Agregar evidencia</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </TableCell>
      <TableCell>
        <Select
          value={action.estado}
          onValueChange={val => onUpdateStatus(action.id, val)}
        >
          <SelectTrigger className="h-7 w-32 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ESTADO_CONFIG).map(([val, conf]) => (
              <SelectItem key={val} value={val} className="text-xs">
                <span className="flex items-center gap-1">{conf.icon}{conf.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

// ── Componente de estadísticas ────────────────────────────────────────────────

function StatsBar({ stats }: { stats: any }) {
  if (!stats) return null;
  const total = Number(stats.totalAcciones) || 0;
  const cumplidas = Number(stats.cumplidas) || 0;
  const pct = total > 0 ? Math.round((cumplidas / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {[
        { label: "Total acciones", value: total, color: "text-gray-700 dark:text-gray-300" },
        { label: "Cumplidas", value: cumplidas, color: "text-green-600" },
        { label: "Vencidas", value: Number(stats.vencidas) || 0, color: "text-red-600" },
        { label: "Con evidencia", value: Number(stats.conEvidencia) || 0, color: "text-blue-600" },
        { label: "% Cumplimiento", value: `${pct}%`, color: pct >= 80 ? "text-green-600" : pct >= 50 ? "text-yellow-600" : "text-red-600" },
      ].map(s => (
        <Card key={s.label} className="py-3">
          <CardContent className="p-0 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function Nom035Matrix() {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    tipoPlan: "",
    estado: "",
    search: "",
    page: 1,
  });
  const [uploadAction, setUploadAction] = useState<any | null>(null);
  const [viewEvidencesAction, setViewEvidencesAction] = useState<any | null>(null);
  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const plansQuery = trpc.nom035Matrix.listPlans.useQuery({ status: "activo", page: 1, pageSize: 20 });
  const actionsQuery = trpc.nom035Matrix.listActions.useQuery({
    planId: selectedPlanId ?? undefined,
    tipoPlan: (filters.tipoPlan as any) || undefined,
    estado: (filters.estado as any) || undefined,
    search: filters.search || undefined,
    page: filters.page,
    pageSize: 25,
  });
  const globalStats = trpc.nom035Matrix.getGlobalStats.useQuery();
  const planStats = trpc.nom035Matrix.getPlanStats.useQuery(
    { planId: selectedPlanId! },
    { enabled: !!selectedPlanId }
  );

  const utils = trpc.useUtils();

  // Mutations de exportación
  const generatePdf = trpc.nom035Matrix.generatePdf.useMutation();
  const exportXlsx = trpc.nom035Matrix.exportXlsx.useMutation();

  const handleExportPdf = async () => {
    if (!selectedPlanId) {
      toast({ title: "Selecciona un plan", description: "Debes seleccionar un plan para generar el PDF.", variant: "destructive" });
      return;
    }
    setIsExporting(true);
    try {
      const result = await generatePdf.mutateAsync({ planId: selectedPlanId, includeEvidenceThumbnails: true });
      const byteArray = Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF generado", description: `Folio: ${result.folio}` });
    } catch (err: any) {
      toast({ title: "Error al generar PDF", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportXlsx = async () => {
    setIsExporting(true);
    try {
      const result = await exportXlsx.mutateAsync({
        planId: selectedPlanId ?? undefined,
        tipoPlan: filters.tipoPlan || undefined,
        estado: filters.estado || undefined,
      });
      const byteArray = Uint8Array.from(atob(result.xlsxBase64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Matriz-NOM035-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "XLSX exportado correctamente" });
    } catch (err: any) {
      toast({ title: "Error al exportar XLSX", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  // Mutations
  const updateAction = trpc.nom035Matrix.updateAction.useMutation({
    onSuccess: () => {
      utils.nom035Matrix.listActions.invalidate();
      utils.nom035Matrix.getPlanStats.invalidate();
      utils.nom035Matrix.getGlobalStats.invalidate();
    },
  });

  const handleUpdateStatus = (id: number, estado: string) => {
    updateAction.mutate({ id, estado: estado as any });
  };

  const handleEvidenceUploaded = () => {
    setUploadAction(null);
    utils.nom035Matrix.listActions.invalidate();
    toast({ title: "Evidencia registrada", description: "La evidencia se agregó correctamente a la acción." });
  };

  const selectedPlan = plansQuery.data?.plans.find(p => p.id === selectedPlanId);
  const stats = selectedPlanId ? planStats.data : globalStats.data;

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Matriz de Acciones NOM-035
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Gestión de planes de intervención, acciones y evidencias de cumplimiento
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => utils.nom035Matrix.listActions.invalidate()}>
            <RefreshCw className="h-4 w-4 mr-1" />Actualizar
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleExportXlsx}
            disabled={isExporting}
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
            Exportar XLSX
          </Button>
          <Button
            variant="outline" size="sm"
            onClick={handleExportPdf}
            disabled={isExporting || !selectedPlanId}
            title={!selectedPlanId ? "Selecciona un plan para generar PDF" : ""}
          >
            {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            Generar PDF
          </Button>
          <Button size="sm" onClick={() => setShowNewPlanDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />Nuevo Plan
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <StatsBar stats={stats} />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Selector de plan */}
        <Select
          value={selectedPlanId?.toString() ?? "all"}
          onValueChange={val => setSelectedPlanId(val === "all" ? null : Number(val))}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos los planes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los planes</SelectItem>
            {plansQuery.data?.plans.map(p => (
              <SelectItem key={p.id} value={p.id.toString()}>
                <span className="flex items-center gap-1">
                  {NIVEL_ICON[p.nivelAplicacion]}
                  <span className="truncate max-w-40">{p.identificadorNivel}</span>
                  <Badge variant="outline" className="text-xs ml-1">{TIPO_PLAN_LABELS[p.tipoPlan]}</Badge>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Tipo de plan */}
        <Select
          value={filters.tipoPlan || "all"}
          onValueChange={val => setFilters(f => ({ ...f, tipoPlan: val === "all" ? "" : val, page: 1 }))}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo de programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="intervencion">Intervención</SelectItem>
            <SelectItem value="violencia_laboral">Violencia Laboral</SelectItem>
            <SelectItem value="no_discriminacion">No Discriminación</SelectItem>
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={filters.estado || "all"}
          onValueChange={val => setFilters(f => ({ ...f, estado: val === "all" ? "" : val, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ESTADO_CONFIG).map(([val, conf]) => (
              <SelectItem key={val} value={val}>{conf.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Búsqueda */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por objetivo, acción o ID..."
            value={filters.search}
            onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabla de acciones */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="w-20 text-xs">ID</TableHead>
              <TableHead className="text-xs">Objetivo / Acción</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
              <TableHead className="text-xs">Prioridad</TableHead>
              <TableHead className="text-xs">Responsable</TableHead>
              <TableHead className="text-xs">Plazo</TableHead>
              <TableHead className="text-xs">Evidencias</TableHead>
              <TableHead className="text-xs">Cambiar estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actionsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="text-sm text-gray-500 mt-2">Cargando acciones...</p>
                </TableCell>
              </TableRow>
            ) : actionsQuery.data?.actions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <BarChart3 className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No hay acciones registradas</p>
                  <p className="text-xs text-gray-400 mt-1">Crea un nuevo plan para generar acciones automáticamente</p>
                  <Button size="sm" className="mt-3" onClick={() => setShowNewPlanDialog(true)}>
                    <Plus className="h-4 w-4 mr-1" />Crear primer plan
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              actionsQuery.data?.actions.map(action => (
                <ActionRow
                  key={action.id}
                  action={action}
                  onUpdateStatus={handleUpdateStatus}
                  onViewEvidences={setViewEvidencesAction}
                  onUploadEvidence={setUploadAction}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {actionsQuery.data && actionsQuery.data.total > 25 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Mostrando {((filters.page - 1) * 25) + 1}–{Math.min(filters.page * 25, actionsQuery.data.total)} de {actionsQuery.data.total} acciones
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm"
              disabled={filters.page === 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
            >Anterior</Button>
            <Button
              variant="outline" size="sm"
              disabled={filters.page * 25 >= actionsQuery.data.total}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
            >Siguiente</Button>
          </div>
        </div>
      )}

      {/* Dialog: Subir evidencia */}
      <Dialog open={!!uploadAction} onOpenChange={open => !open && setUploadAction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar Evidencia</DialogTitle>
            <DialogDescription>
              Acción: <span className="font-semibold">{uploadAction?.accionId}</span> — {uploadAction?.objetivo?.substring(0, 80)}
            </DialogDescription>
          </DialogHeader>
          {uploadAction && (
            <EvidenceUploader
              actionId={uploadAction.id}
              onSuccess={handleEvidenceUploaded}
              onCancel={() => setUploadAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Ver evidencias */}
      <Dialog open={!!viewEvidencesAction} onOpenChange={open => !open && setViewEvidencesAction(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Evidencias — {viewEvidencesAction?.accionId}</DialogTitle>
            <DialogDescription>{viewEvidencesAction?.objetivo?.substring(0, 100)}</DialogDescription>
          </DialogHeader>
          {viewEvidencesAction && (
            <EvidenceList actionId={viewEvidencesAction.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Nuevo plan */}
      <Dialog open={showNewPlanDialog} onOpenChange={setShowNewPlanDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Generar Nuevo Plan de Intervención</DialogTitle>
            <DialogDescription>
              La IA generará un plan con acciones específicas basado en los datos de evaluación NOM-035.
            </DialogDescription>
          </DialogHeader>
          <NewPlanForm
            onSuccess={(planId) => {
              setShowNewPlanDialog(false);
              setSelectedPlanId(planId);
              utils.nom035Matrix.listPlans.invalidate();
              utils.nom035Matrix.listActions.invalidate();
              toast({ title: "Plan generado", description: "El plan y sus acciones fueron creados correctamente." });
            }}
            onCancel={() => setShowNewPlanDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Lista de evidencias ───────────────────────────────────────────────────────

function EvidenceList({ actionId }: { actionId: number }) {
  const evidencesQuery = trpc.nom035Matrix.getEvidences.useQuery({ actionId });
  const deleteEvidence = trpc.nom035Matrix.deleteEvidence.useMutation({
    onSuccess: () => evidencesQuery.refetch(),
  });
  const getDownloadUrl = trpc.nom035Matrix.getDownloadUrl.useQuery(
    { id: 0 },
    { enabled: false }
  );
  const utils = trpc.useUtils();

  const handleDownload = async (id: number, nombre: string) => {
    try {
      const result = await utils.nom035Matrix.getDownloadUrl.fetch({ id });
      const a = document.createElement("a");
      a.href = result.url;
      a.download = nombre;
      a.target = "_blank";
      a.click();
    } catch {
      toast({ title: "Error al descargar", variant: "destructive" });
    }
  };

  if (evidencesQuery.isLoading) {
    return <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>;
  }

  if (!evidencesQuery.data?.length) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Paperclip className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No hay evidencias registradas para esta acción.</p>
      </div>
    );
  }

  const TIPO_LABELS: Record<string, string> = {
    acta_capacitacion: "Acta Capacitación",
    registro_fotografico: "Foto",
    correo_electronico: "Correo",
    lista_asistencia: "Lista Asistencia",
    comunicado_interno: "Comunicado",
    captura_pantalla: "Captura",
    acta_reunion: "Acta Reunión",
    contrato_servicio: "Contrato",
    politica_firmada: "Política",
    otro: "Otro",
  };

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto">
      {evidencesQuery.data.map(ev => (
        <div key={ev.id} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <FileText className="h-5 w-5 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{ev.nombreArchivo}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-xs">{TIPO_LABELS[ev.tipoEvidencia] || ev.tipoEvidencia}</Badge>
              {ev.descripcion && <span className="text-xs text-gray-500 truncate">{ev.descripcion}</span>}
              <span className="text-xs text-gray-400">
                {new Date(ev.fechaSubida).toLocaleDateString("es-MX")}
              </span>
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => handleDownload(ev.id, ev.nombreArchivo)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600"
              onClick={() => {
                if (confirm("¿Eliminar esta evidencia?")) {
                  deleteEvidence.mutate({ id: ev.id });
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Formulario de nuevo plan ──────────────────────────────────────────────────

function NewPlanForm({ onSuccess, onCancel }: { onSuccess: (planId: number) => void; onCancel: () => void }) {
  const [form, setForm] = useState({
    nivelAplicacion: "organizacional" as "organizacional" | "grupal" | "individual",
    tipoPlan: "intervencion" as "intervencion" | "violencia_laboral" | "no_discriminacion" | "consolidado",
    identificadorNivel: "",
    centroTrabajo: "",
    giroEmpresa: "",
    totalTrabajadores: "",
    filtroAplicado: "",
  });

  const generatePlan = trpc.nom035Matrix.generatePlan.useMutation({
    onSuccess: (data) => onSuccess(data.planId),
    onError: (err) => toast({ title: "Error al generar plan", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.identificadorNivel.trim()) {
      toast({ title: "Falta el nombre del centro/área", variant: "destructive" });
      return;
    }
    generatePlan.mutate({
      nivelAplicacion: form.nivelAplicacion,
      tipoPlan: form.tipoPlan,
      identificadorNivel: form.identificadorNivel,
      centroTrabajo: form.centroTrabajo || undefined,
      giroEmpresa: form.giroEmpresa || undefined,
      totalTrabajadores: form.totalTrabajadores ? Number(form.totalTrabajadores) : undefined,
      filtroAplicado: form.filtroAplicado || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nivel de aplicación *</label>
          <Select value={form.nivelAplicacion} onValueChange={val => setForm(f => ({ ...f, nivelAplicacion: val as any }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="organizacional">Organizacional</SelectItem>
              <SelectItem value="grupal">Grupal</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tipo de programa *</label>
          <Select value={form.tipoPlan} onValueChange={val => setForm(f => ({ ...f, tipoPlan: val as any }))}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="intervencion">Intervención de Riesgos</SelectItem>
              <SelectItem value="violencia_laboral">Prevención Violencia Laboral</SelectItem>
              <SelectItem value="no_discriminacion">No Discriminación</SelectItem>
              <SelectItem value="consolidado">Consolidado (todos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nombre de la empresa / área / trabajador *</label>
        <Input
          value={form.identificadorNivel}
          onChange={e => setForm(f => ({ ...f, identificadorNivel: e.target.value }))}
          placeholder="Ej. Empresa ABC S.A. de C.V. / Departamento Logística"
          className="mt-1"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Centro de trabajo</label>
          <Input value={form.centroTrabajo} onChange={e => setForm(f => ({ ...f, centroTrabajo: e.target.value }))} placeholder="Ej. Planta Monterrey" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Giro de empresa</label>
          <Input value={form.giroEmpresa} onChange={e => setForm(f => ({ ...f, giroEmpresa: e.target.value }))} placeholder="Ej. Manufactura" className="mt-1" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Total de trabajadores</label>
          <Input type="number" value={form.totalTrabajadores} onChange={e => setForm(f => ({ ...f, totalTrabajadores: e.target.value }))} placeholder="Ej. 150" className="mt-1" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Filtro aplicado</label>
          <Input value={form.filtroAplicado} onChange={e => setForm(f => ({ ...f, filtroAplicado: e.target.value }))} placeholder="Ej. Turno nocturno" className="mt-1" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={generatePlan.isPending}>Cancelar</Button>
        <Button type="submit" disabled={generatePlan.isPending}>
          {generatePlan.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Generando con IA...</>
          ) : (
            <><Plus className="h-4 w-4 mr-1" />Generar Plan</>
          )}
        </Button>
      </div>
    </form>
  );
}
