/**
 * AuditLogReport.tsx
 * Sprint 79 — Reporte ejecutivo de bitácora de cambios NOM-035.
 * Filtros por campo, usuario y rango de fechas. Exportación XLSX y PDF.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import {
  FileText, Download, Search, Filter, RefreshCw, Loader2,
  History, User, Calendar, ChevronLeft, ChevronRight, FileSpreadsheet,
  ArrowUpDown, Clock
} from "lucide-react";

// ── Constantes ────────────────────────────────────────────────────────────────

const CAMPO_LABELS: Record<string, string> = {
  estado: "Estado",
  responsable: "Responsable",
  plazo: "Plazo",
  prioridad: "Prioridad",
  observaciones: "Observaciones",
  objetivo: "Objetivo",
  accion: "Acción",
  recursos: "Recursos",
  creacion: "Creación",
};

const CAMPO_COLORS: Record<string, string> = {
  estado: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  responsable: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  plazo: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  prioridad: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  observaciones: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  objetivo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  accion: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  recursos: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
  creacion: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
};

const PAGE_SIZE = 30;

// ── Componente principal ──────────────────────────────────────────────────────

export default function AuditLogReport() {
  const [filters, setFilters] = useState({
    planId: "",
    actionId: "",
    campo: "",
    changedByName: "",
    fromDate: "",
    toDate: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState<"xlsx" | "pdf" | null>(null);

  // Queries
  const historyQuery = trpc.nom035Matrix.getActionHistory.useQuery(
    {
      actionId: appliedFilters.actionId ? parseInt(appliedFilters.actionId) : undefined,
      planId: appliedFilters.planId ? parseInt(appliedFilters.planId) : undefined,
      limit: 500,
    },
    { enabled: true }
  );

  // Filtrado en cliente (el backend filtra por actionId; el resto en memoria)
  const allRows = useMemo(() => {
    const rows = historyQuery.data ?? [];
    return rows.filter(row => {
      if (appliedFilters.campo && row.campo !== appliedFilters.campo) return false;
      if (appliedFilters.changedByName &&
        !row.changedByName?.toLowerCase().includes(appliedFilters.changedByName.toLowerCase())) return false;
      if (appliedFilters.fromDate && row.createdAt &&
        new Date(row.createdAt) < new Date(appliedFilters.fromDate)) return false;
      if (appliedFilters.toDate && row.createdAt &&
        new Date(row.createdAt) > new Date(appliedFilters.toDate + "T23:59:59")) return false;
      return true;
    });
  }, [historyQuery.data, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows = allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Mutations de exportación
  const exportXlsx = trpc.nom035Matrix.exportHistoryXlsx.useMutation();
  const exportPdf = trpc.nom035Matrix.exportHistoryPdf.useMutation();

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleClearFilters = () => {
    const empty = { planId: "", actionId: "", campo: "", changedByName: "", fromDate: "", toDate: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  const handleExportXlsx = async () => {
    setIsExporting("xlsx");
    try {
      const result = await exportXlsx.mutateAsync({
        planId: appliedFilters.planId ? parseInt(appliedFilters.planId) : undefined,
        actionId: appliedFilters.actionId ? parseInt(appliedFilters.actionId) : undefined,
        campo: appliedFilters.campo || undefined,
        changedByName: appliedFilters.changedByName || undefined,
        fromDate: appliedFilters.fromDate || undefined,
        toDate: appliedFilters.toDate || undefined,
      });
      const byteArray = Uint8Array.from(atob(result.xlsxBase64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Bitacora-NOM035-${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "XLSX exportado", description: `${result.total} registros exportados.` });
    } catch (err: any) {
      toast({ title: "Error al exportar XLSX", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting("pdf");
    try {
      const result = await exportPdf.mutateAsync({
        planId: appliedFilters.planId ? parseInt(appliedFilters.planId) : undefined,
        actionId: appliedFilters.actionId ? parseInt(appliedFilters.actionId) : undefined,
        campo: appliedFilters.campo || undefined,
        changedByName: appliedFilters.changedByName || undefined,
        fromDate: appliedFilters.fromDate || undefined,
        toDate: appliedFilters.toDate || undefined,
      });
      const byteArray = Uint8Array.from(atob(result.pdfBase64), c => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${result.folio}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "PDF generado", description: `Folio: ${result.folio} | ${result.total} registros.` });
    } catch (err: any) {
      toast({ title: "Error al generar PDF", description: err.message, variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };

  const hasActiveFilters = Object.values(appliedFilters).some(v => v !== "");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <History className="h-6 w-6 text-violet-600" />
            Reporte de Bitácora de Cambios
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Historial completo de modificaciones en acciones NOM-035 — auditoría interna
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportXlsx}
            disabled={isExporting !== null}
            className="flex items-center gap-1.5"
          >
            {isExporting === "xlsx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Exportar XLSX
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting !== null}
            className="flex items-center gap-1.5"
          >
            {isExporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4 text-red-600" />}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            Filtros de búsqueda
            {hasActiveFilters && (
              <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs">
                Activos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">ID Plan</label>
              <Input
                type="number"
                placeholder="Ej: 1"
                value={filters.planId}
                onChange={e => setFilters(f => ({ ...f, planId: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">ID Acción</label>
              <Input
                type="number"
                placeholder="Ej: 42"
                value={filters.actionId}
                onChange={e => setFilters(f => ({ ...f, actionId: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Campo modificado</label>
              <Select value={filters.campo} onValueChange={v => setFilters(f => ({ ...f, campo: v === "todos" ? "" : v }))}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {Object.entries(CAMPO_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Usuario</label>
              <Input
                placeholder="Nombre del usuario"
                value={filters.changedByName}
                onChange={e => setFilters(f => ({ ...f, changedByName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Desde</label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500 font-medium">Hasta</label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleApplyFilters} className="flex items-center gap-1.5">
              <Search className="h-3.5 w-3.5" />
              Aplicar filtros
            </Button>
            {hasActiveFilters && (
              <Button size="sm" variant="ghost" onClick={handleClearFilters} className="text-gray-500">
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          {historyQuery.isLoading ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando...</span>
          ) : (
            <>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{allRows.length}</span> registros encontrados
              {hasActiveFilters && " (filtrados)"}
            </>
          )}
        </span>
        <span>Página {page} de {totalPages}</span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="w-16 text-xs">ID</TableHead>
              <TableHead className="w-20 text-xs">Acción</TableHead>
              <TableHead className="w-28 text-xs">Campo</TableHead>
              <TableHead className="text-xs">Valor Anterior</TableHead>
              <TableHead className="text-xs">Valor Nuevo</TableHead>
              <TableHead className="w-40 text-xs">
                <span className="flex items-center gap-1"><User className="h-3 w-3" /> Usuario</span>
              </TableHead>
              <TableHead className="w-36 text-xs">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Fecha</span>
              </TableHead>
              <TableHead className="text-xs">Nota</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historyQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2 text-gray-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Cargando historial...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <History className="h-10 w-10 opacity-30" />
                    <p className="text-sm">
                      {hasActiveFilters
                        ? "No hay registros con los filtros aplicados"
                        : "Ingresa un ID de acción o plan para ver el historial"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row, idx) => (
                <TableRow key={row.id} className={idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-800/20"}>
                  <TableCell className="text-xs text-gray-400">{row.id}</TableCell>
                  <TableCell className="text-xs font-mono text-gray-600 dark:text-gray-400">{row.actionId}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${CAMPO_COLORS[row.campo] ?? "bg-gray-100 text-gray-700"}`}>
                      {CAMPO_LABELS[row.campo] ?? row.campo}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.valorAnterior ? (
                      <span className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                        {row.valorAnterior}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {row.valorNuevo ? (
                      <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                        {row.valorNuevo}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="h-6 w-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <User className="h-3 w-3 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 leading-tight">
                          {row.changedByName ?? "Sistema"}
                        </p>
                        {row.changedByEmail && (
                          <p className="text-xs text-gray-400 leading-tight">{row.changedByEmail}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-gray-500">
                    {row.createdAt
                      ? new Date(row.createdAt).toLocaleString("es-MX", {
                          dateStyle: "short",
                          timeStyle: "short",
                          timeZone: "America/Mexico_City",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-gray-500 max-w-[200px] truncate">
                    {row.nota ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allRows.length)} de {allRows.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400 px-2">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
