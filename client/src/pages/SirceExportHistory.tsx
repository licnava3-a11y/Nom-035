import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  History,
  Download,
  RefreshCw,
  FileCode2,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  AlertCircle,
  Info,
  Filter,
  X,
  CalendarRange,
  User,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 20;

function formatDateTime(ts: Date | string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateHash(hash: string): string {
  return hash.slice(0, 8) + "…" + hash.slice(-8);
}

/** Convierte una cadena "YYYY-MM-DD" a timestamp ms (inicio del día UTC) */
function dateStrToTs(str: string): number {
  return new Date(str + "T00:00:00.000Z").getTime();
}

/** Convierte una cadena "YYYY-MM-DD" a timestamp ms (fin del día UTC) */
function dateStrToEndTs(str: string): number {
  return new Date(str + "T23:59:59.999Z").getTime();
}

/** Formatea Date a "YYYY-MM-DD" para input[type=date] */
function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type QuickPeriod = "today" | "week" | "month" | "prev_week" | "prev_month" | "prev_year" | "year";

function getQuickPeriodDates(period: QuickPeriod): { from: string; to: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (period) {
    case "today": {
      const today = toDateInputValue(now);
      return { from: today, to: today };
    }
    case "week": {
      const dayOfWeek = now.getDay(); // 0=Dom
      const startOfWeek = new Date(y, m, d - dayOfWeek);
      return { from: toDateInputValue(startOfWeek), to: toDateInputValue(now) };
    }
    case "month": {
      return { from: `${y}-${String(m + 1).padStart(2, "0")}-01`, to: toDateInputValue(now) };
    }
    case "prev_week": {
      const dayOfWeek = now.getDay();
      const startOfThisWeek = new Date(y, m, d - dayOfWeek);
      const startOfPrevWeek = new Date(startOfThisWeek);
      startOfPrevWeek.setDate(startOfPrevWeek.getDate() - 7);
      const endOfPrevWeek = new Date(startOfThisWeek);
      endOfPrevWeek.setDate(endOfPrevWeek.getDate() - 1);
      return { from: toDateInputValue(startOfPrevWeek), to: toDateInputValue(endOfPrevWeek) };
    }
    case "prev_month": {
      const prevMonth = m === 0 ? 11 : m - 1;
      const prevYear = m === 0 ? y - 1 : y;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      return {
        from: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`,
        to: `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
      };
    }
    case "prev_year": {
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    }
    case "year": {
      return { from: `${y}-01-01`, to: toDateInputValue(now) };
    }
  }
}

export default function SirceExportHistory() {
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [errorDialog, setErrorDialog] = useState<string | null>(null);

  // Estado de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportedByName, setExportedByName] = useState("");
  const [companyRfc, setCompanyRfc] = useState("");

  // Contar filtros activos
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (exportedByName.trim()) count++;
    if (companyRfc.trim()) count++;
    return count;
  }, [dateFrom, dateTo, exportedByName, companyRfc]);

  // Construir parámetros del query
  const queryParams = useMemo(() => {
    const params: {
      page: number;
      pageSize: number;
      dateFrom?: number;
      dateTo?: number;
      exportedByName?: string;
      companyRfc?: string;
    } = { page, pageSize: PAGE_SIZE };

    if (dateFrom) params.dateFrom = dateStrToTs(dateFrom);
    if (dateTo) params.dateTo = dateStrToEndTs(dateTo);
    if (exportedByName.trim()) params.exportedByName = exportedByName.trim();
    if (companyRfc.trim()) params.companyRfc = companyRfc.trim();

    return params;
  }, [page, dateFrom, dateTo, exportedByName, companyRfc]);

  const { data, isLoading, refetch } = trpc.dc3.listSirceExports.useQuery(queryParams, {
    refetchOnWindowFocus: false,
  });

  const redownloadMutation = trpc.dc3.redownloadSirceExport.useMutation({
    onSuccess: (result) => {
      const a = document.createElement("a");
      a.href = result.url;
      a.download = result.filename;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Descargando ${result.filename}`);
    },
    onError: (err) => {
      setErrorDialog(err.message);
    },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  const handleCopyHash = (id: number, hash: string) => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopiedId(id);
      toast.success("Hash copiado al portapapeles");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleClearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setExportedByName("");
    setCompanyRfc("");
    setPage(1);
  };

  const handleQuickPeriod = (period: QuickPeriod) => {
    const { from, to } = getQuickPeriodDates(period);
    setDateFrom(from);
    setDateTo(to);
    setPage(1);
  };

  // Resetear página al cambiar filtros
  const handleFilterChange = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Historial de Exportaciones SIRCE
              </h1>
              <p className="text-sm text-muted-foreground">
                Registro de todos los archivos XML generados para el Sistema de Registro de
                Constancias de Empresas (SIRCE-STPS)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Panel de filtros */}
        {showFilters && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros de búsqueda
                </CardTitle>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Accesos rápidos a períodos */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Períodos rápidos
                </Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "today" as QuickPeriod, label: "Hoy" },
                    { key: "week" as QuickPeriod, label: "Esta semana" },
                    { key: "month" as QuickPeriod, label: "Este mes" },
                    { key: "year" as QuickPeriod, label: "Este año" },
                    { key: "prev_week" as QuickPeriod, label: "Semana anterior" },
                    { key: "prev_month" as QuickPeriod, label: "Mes anterior" },
                    { key: "prev_year" as QuickPeriod, label: "Año anterior" },
                  ].map(({ key, label }) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleQuickPeriod(key)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Filtros de fecha y texto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fecha desde */}
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-from" className="text-xs flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Fecha desde
                  </Label>
                  <Input
                    id="filter-date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Fecha hasta */}
                <div className="space-y-1.5">
                  <Label htmlFor="filter-date-to" className="text-xs flex items-center gap-1">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Fecha hasta
                  </Label>
                  <Input
                    id="filter-date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Usuario exportador */}
                <div className="space-y-1.5">
                  <Label htmlFor="filter-user" className="text-xs flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    Usuario exportador
                  </Label>
                  <Input
                    id="filter-user"
                    type="text"
                    placeholder="Nombre del usuario…"
                    value={exportedByName}
                    onChange={(e) => handleFilterChange(setExportedByName)(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* RFC empresa */}
                <div className="space-y-1.5">
                  <Label htmlFor="filter-rfc" className="text-xs flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    RFC empresa
                  </Label>
                  <Input
                    id="filter-rfc"
                    type="text"
                    placeholder="RFC de la empresa…"
                    value={companyRfc}
                    onChange={(e) => handleFilterChange(setCompanyRfc)(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              {/* Resumen de filtros activos */}
              {activeFilterCount > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {dateFrom && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <CalendarRange className="h-3 w-3" />
                      Desde: {dateFrom}
                      <button onClick={() => handleFilterChange(setDateFrom)("")} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {dateTo && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <CalendarRange className="h-3 w-3" />
                      Hasta: {dateTo}
                      <button onClick={() => handleFilterChange(setDateTo)("")} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {exportedByName.trim() && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <User className="h-3 w-3" />
                      Usuario: {exportedByName}
                      <button onClick={() => handleFilterChange(setExportedByName)("")} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {companyRfc.trim() && (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Building2 className="h-3 w-3" />
                      RFC: {companyRfc}
                      <button onClick={() => handleFilterChange(setCompanyRfc)("")} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileCode2 className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{data?.total ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeFilterCount > 0 ? "Exportaciones encontradas" : "Exportaciones totales"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.exports.filter((e) => e.fileKey).length ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Disponibles para re-descarga</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Download className="h-8 w-8 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {data?.exports.reduce((sum, e) => sum + e.recordCount, 0) ?? "—"}
                  </p>
                  <p className="text-sm text-muted-foreground">Constancias exportadas (esta página)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de historial */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro de exportaciones</CardTitle>
            <CardDescription>
              {activeFilterCount > 0
                ? `Mostrando resultados filtrados — ${data?.total ?? 0} exportaciones encontradas`
                : "Cada fila corresponde a un archivo XML generado. Los archivos se almacenan durante 90 días en el servidor."}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Cargando historial…
              </div>
            ) : !data || data.exports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <History className="h-12 w-12 opacity-30" />
                {activeFilterCount > 0 ? (
                  <>
                    <p className="text-sm">No se encontraron exportaciones con los filtros aplicados.</p>
                    <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1">
                      <X className="h-3.5 w-3.5" />
                      Limpiar filtros
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm">No hay exportaciones registradas aún.</p>
                    <p className="text-xs">
                      Las exportaciones aparecerán aquí después de generar el primer archivo SIRCE
                      desde el módulo DC-3.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px] text-center">#</TableHead>
                      <TableHead>Archivo</TableHead>
                      <TableHead className="text-center">Constancias</TableHead>
                      <TableHead>Exportado por</TableHead>
                      <TableHead>Fecha y hora</TableHead>
                      <TableHead>Hash SHA-256</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.exports.map((exp) => (
                      <TableRow key={exp.id} className="hover:bg-muted/30">
                        {/* ID */}
                        <TableCell className="text-center text-muted-foreground text-xs font-mono">
                          {exp.id}
                        </TableCell>

                        {/* Nombre del archivo */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileCode2 className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="font-mono text-xs break-all">{exp.filename}</span>
                          </div>
                          {exp.companyRfc && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-6">
                              RFC: {exp.companyRfc}
                            </p>
                          )}
                        </TableCell>

                        {/* Cantidad de constancias */}
                        <TableCell className="text-center">
                          <Badge variant="secondary" className="font-mono">
                            {exp.recordCount}
                          </Badge>
                        </TableCell>

                        {/* Usuario exportador */}
                        <TableCell>
                          <span className="text-sm">
                            {exp.exportedByName ?? `Usuario #${exp.exportedBy}`}
                          </span>
                        </TableCell>

                        {/* Fecha */}
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDateTime(exp.exportedAt)}
                        </TableCell>

                        {/* Hash SHA-256 */}
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground">
                              {truncateHash(exp.fileHash)}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleCopyHash(exp.id, exp.fileHash)}
                                >
                                  {copiedId === exp.id ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copiar hash completo</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>

                        {/* Estado de almacenamiento */}
                        <TableCell className="text-center">
                          {exp.fileKey ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Disponible
                            </Badge>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge
                                  variant="outline"
                                  className="text-amber-600 border-amber-300 gap-1"
                                >
                                  <AlertCircle className="h-3 w-3" />
                                  Sin archivo
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                El archivo no fue guardado en el almacenamiento. Genere una nueva
                                exportación.
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                disabled={!exp.fileKey || redownloadMutation.isPending}
                                onClick={() =>
                                  redownloadMutation.mutate({ id: exp.id })
                                }
                              >
                                {redownloadMutation.isPending &&
                                redownloadMutation.variables?.id === exp.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Download className="h-3.5 w-3.5" />
                                )}
                                Descargar
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {exp.fileKey
                                ? "Descargar el archivo XML original"
                                : "Archivo no disponible para re-descarga"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>

          {/* Paginación */}
          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * PAGE_SIZE + 1}–
                {Math.min(page * PAGE_SIZE, data.total)} de {data.total} exportaciones
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Nota informativa */}
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4">
          <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-medium">Verificación de integridad</p>
            <p>
              El hash SHA-256 de cada exportación permite verificar que el archivo no fue
              modificado después de su generación. Para verificar, calcule el SHA-256 del archivo
              descargado y compárelo con el hash registrado en esta tabla.
            </p>
          </div>
        </div>
      </div>

      {/* Diálogo de error al re-descargar */}
      <AlertDialog open={!!errorDialog} onOpenChange={() => setErrorDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Archivo no disponible
            </AlertDialogTitle>
            <AlertDialogDescription>{errorDialog}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cerrar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
