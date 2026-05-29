import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Filter,
  BarChart3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  Mail,
  FileText,
  Users,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  History,
  X,
  TrendingUp,
  FileDown,
} from "lucide-react";

// ── Componente de gráfica de tendencias mensuales ───────────────────────────────────────
function MonthlyTrendsChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);
  const [months, setMonths] = useState(12);

  const { data: trends, isLoading } = trpc.meetingMinutes.getMonthlyTrends.useQuery({ months });

  useEffect(() => {
    if (!trends || !canvasRef.current) return;

    const loadChart = async () => {
      const { Chart, registerables } = await import("chart.js");
      Chart.register(...registerables);

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;

      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: {
          labels: trends.map((t) => t.label),
          datasets: [
            {
              label: "Enviados",
              data: trends.map((t) => t.sent),
              backgroundColor: "rgba(59, 130, 246, 0.7)",
              borderColor: "rgba(59, 130, 246, 1)",
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            },
            {
              label: "Leídos",
              data: trends.map((t) => t.read),
              backgroundColor: "rgba(22, 163, 74, 0.7)",
              borderColor: "rgba(22, 163, 74, 1)",
              borderWidth: 1,
              borderRadius: 4,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "top", labels: { boxWidth: 12, font: { size: 12 } } },
            tooltip: {
              callbacks: {
                afterBody: (items: any[]) => {
                  const idx = items[0]?.dataIndex;
                  if (idx === undefined) return [];
                  const t = trends[idx];
                  return [`Tasa de lectura: ${t.readRate}%`];
                },
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 11 } } },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, font: { size: 11 } },
              grid: { color: "rgba(0,0,0,0.06)" },
            },
          },
        },
      });
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [trends]);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Tendencias Mensuales de Despachos</span>
        </div>
        <div className="flex items-center gap-1">
          {[6, 12, 24].map((m) => (
            <Button
              key={m}
              variant={months === m ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setMonths(m)}
            >
              {m}m
            </Button>
          ))}
        </div>
      </div>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div style={{ height: "220px" }}>
          <canvas ref={canvasRef} />
        </div>
      )}
    </div>
  );
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
type StatusFilter = "all" | "sent" | "read" | "bounced";

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  read: { label: "Leído", icon: <CheckCircle2 className="h-3.5 w-3.5" />, className: "bg-green-100 text-green-700 border-green-200" },
  sent: { label: "Enviado", icon: <Clock className="h-3.5 w-3.5" />, className: "bg-blue-100 text-blue-700 border-blue-200" },
  bounced: { label: "Rebotado", icon: <AlertTriangle className="h-3.5 w-3.5" />, className: "bg-red-100 text-red-700 border-red-200" },
};

const PERIOD_OPTIONS = [
  { value: "all", label: "Todo el tiempo" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "prev_month", label: "Mes anterior" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

function getPeriodDates(period: string): { dateFrom: string | null; dateTo: string | null } {
  const now = new Date();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  switch (period) {
    case "today":
      return { dateFrom: fmt(now), dateTo: fmt(now) };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { dateFrom: fmt(start), dateTo: fmt(now) };
    }
    case "month":
      return { dateFrom: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: fmt(now) };
    case "prev_month": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { dateFrom: fmt(first), dateTo: fmt(last) };
    }
    case "year":
      return { dateFrom: fmt(new Date(now.getFullYear(), 0, 1)), dateTo: fmt(now) };
    default:
      return { dateFrom: null, dateTo: null };
  }
}

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function DispatchesPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Filtros
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [recipientFilter, setRecipientFilter] = useState<string>("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const { dateFrom, dateTo } = useMemo(() => {
    if (periodFilter === "custom") {
      return { dateFrom: customDateFrom || null, dateTo: customDateTo || null };
    }
    return getPeriodDates(periodFilter);
  }, [periodFilter, customDateFrom, customDateTo]);

  const { data, isLoading, refetch } = trpc.minuteRecipients.getAllDispatches.useQuery({
    page,
    pageSize: PAGE_SIZE,
    status: statusFilter,
    recipientId: recipientFilter !== "all" ? parseInt(recipientFilter, 10) : null,
    dateFrom: dateFrom ?? undefined,
    dateTo: dateTo ?? undefined,
    search: search.trim() || undefined,
  }, { placeholderData: (prev: any) => prev });

  const markAsReadMutation = trpc.minuteRecipients.markAsRead.useMutation({
    onSuccess: () => {
      utils.minuteRecipients.getAllDispatches.invalidate();
      toast({ title: "Marcado como leído" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const dispatches = data?.dispatches ?? [];
  const stats = data?.stats ?? { total: 0, read: 0, unread: 0, bounced: 0, sent: 0, readRate: 0 };
  const pagination = data?.pagination ?? { total: 0, page: 1, pageSize: PAGE_SIZE, totalPages: 1 };
  const recipients = data?.recipients ?? [];

  const hasActiveFilters = statusFilter !== "all" || recipientFilter !== "all" || periodFilter !== "all" || search.trim() !== "";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setRecipientFilter("all");
    setPeriodFilter("all");
    setCustomDateFrom("");
    setCustomDateTo("");
    setPage(1);
  };

  // Exportar a PDF ejecutivo
  const handleExportPDF = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (recipientFilter !== "all") params.set("recipientId", recipientFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      if (search.trim()) params.set("search", search.trim());

      toast({ title: "Generando PDF...", description: "Esto puede tomar unos segundos." });

      const response = await fetch(`/api/export/dispatches/pdf?${params.toString()}`);
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Error desconocido" }));
        throw new Error(err.error ?? "Error al generar el PDF");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-despachos-minutas-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "PDF descargado correctamente" });
    } catch (e: any) {
      toast({ title: "Error al generar PDF", description: e.message, variant: "destructive" });
    }
  };

  // Exportar a XLSX
  const handleExport = async () => {
    try {
      const XLSX = await import("xlsx");
      const rows = dispatches.map((d) => ({
        "Folio Minuta": d.minuteFolio ?? "",
        "Título Minuta": d.minuteTitle ?? "",
        "Tipo Reunión": d.minuteType ?? "",
        "Fecha Reunión": formatDate(d.minuteDate),
        "Destinatario": d.recipientName ?? "",
        "Correo": d.recipientEmail ?? "",
        "Cargo": d.recipientPosition ?? "",
        "Área": d.recipientDepartment ?? "",
        "Fecha Envío": formatDateTime(d.sentAt),
        "Fecha Lectura": d.readAt ? formatDateTime(d.readAt) : "Sin confirmar",
        "Estado": STATUS_MAP[d.status]?.label ?? d.status,
        "Notas": d.notes ?? "",
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Despachos");
      XLSX.writeFile(wb, `despachos_minutas_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Exportado correctamente", description: `${rows.length} registros exportados.` });
    } catch (e: any) {
      toast({ title: "Error al exportar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Panel de Despachos Globales
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Trazabilidad documental de todas las minutas enviadas a destinatarios del comité
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />Exportar XLSX
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <FileDown className="h-3.5 w-3.5" />Reporte PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setLocation("/committee/minute-recipients")} className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Catálogo
          </Button>
        </div>
      </div>

      {/* Gráfica de tendencias mensuales */}
      <MonthlyTrendsChart />

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: <FileText className="h-4 w-4 text-primary" />, bg: "bg-primary/10", label: "Total", value: stats.total, color: "" },
          { icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, bg: "bg-green-500/10", label: "Leídos", value: stats.read, color: "text-green-600" },
          { icon: <Clock className="h-4 w-4 text-blue-600" />, bg: "bg-blue-500/10", label: "Enviados", value: stats.sent, color: "text-blue-600" },
          { icon: <Mail className="h-4 w-4 text-amber-600" />, bg: "bg-amber-500/10", label: "Sin leer", value: stats.unread, color: "text-amber-600" },
          { icon: <AlertTriangle className="h-4 w-4 text-red-600" />, bg: "bg-red-500/10", label: "Rebotados", value: stats.bounced, color: "text-red-600" },
          { icon: <BarChart3 className="h-4 w-4 text-violet-600" />, bg: "bg-violet-500/10", label: "Tasa lectura", value: `${stats.readRate}%`, color: "text-violet-600" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-3 flex items-center gap-2.5">
            <div className={`p-1.5 rounded-md ${card.bg} shrink-0`}>{card.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground leading-tight">{card.label}</p>
              <p className={`text-xl font-bold leading-tight ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filtros</span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 text-xs gap-1 ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />Limpiar filtros
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar destinatario, minuta o folio..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Estado */}
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="read">Leído</SelectItem>
              <SelectItem value="bounced">Rebotado</SelectItem>
            </SelectContent>
          </Select>

          {/* Destinatario */}
          <Select value={recipientFilter} onValueChange={(v) => { setRecipientFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Destinatario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los destinatarios</SelectItem>
              {recipients.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Período */}
          <Select value={periodFilter} onValueChange={(v) => { setPeriodFilter(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rango de fechas personalizado */}
        {periodFilter === "custom" && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground shrink-0">Desde:</span>
            <Input type="date" value={customDateFrom} onChange={(e) => setCustomDateFrom(e.target.value)} className="h-8 text-sm w-40" />
            <span className="text-xs text-muted-foreground shrink-0">Hasta:</span>
            <Input type="date" value={customDateTo} onChange={(e) => setCustomDateTo(e.target.value)} className="h-8 text-sm w-40" />
          </div>
        )}
      </div>

      {/* Tabla de despachos */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
          <span className="text-sm font-medium">
            {isLoading ? "Cargando..." : `${pagination.total} despacho${pagination.total !== 1 ? "s" : ""} encontrado${pagination.total !== 1 ? "s" : ""}`}
          </span>
          {pagination.totalPages > 1 && (
            <span className="text-xs text-muted-foreground">
              Página {pagination.page} de {pagination.totalPages}
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold text-xs">Folio</TableHead>
                <TableHead className="font-semibold text-xs">Minuta</TableHead>
                <TableHead className="font-semibold text-xs">Destinatario</TableHead>
                <TableHead className="font-semibold text-xs">Cargo / Área</TableHead>
                <TableHead className="font-semibold text-xs">Fecha Envío</TableHead>
                <TableHead className="font-semibold text-xs">Fecha Lectura</TableHead>
                <TableHead className="font-semibold text-xs text-center">Estado</TableHead>
                <TableHead className="font-semibold text-xs text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : dispatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <History className="h-10 w-10 opacity-25" />
                      <p className="font-medium">No se encontraron despachos</p>
                      <p className="text-xs">
                        {hasActiveFilters
                          ? "Intenta ajustar los filtros para ver más resultados."
                          : "Los despachos aparecerán aquí cuando se vinculen destinatarios a las minutas."}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1 gap-1">
                          <X className="h-3.5 w-3.5" />Limpiar filtros
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                dispatches.map((dispatch) => {
                  const statusInfo = STATUS_MAP[dispatch.status] ?? STATUS_MAP.sent;
                  return (
                    <TableRow key={dispatch.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                          {dispatch.minuteFolio ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <p className="text-sm font-medium truncate" title={dispatch.minuteTitle ?? undefined}>
                          {dispatch.minuteTitle ?? <span className="italic text-muted-foreground">Sin título</span>}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(dispatch.minuteDate)}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{dispatch.recipientName ?? "—"}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />{dispatch.recipientEmail ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <p>{dispatch.recipientPosition ?? "—"}</p>
                        {dispatch.recipientDepartment && (
                          <p className="text-xs opacity-75">{dispatch.recipientDepartment}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{formatDateTime(dispatch.sentAt)}</TableCell>
                      <TableCell className="text-xs">
                        {dispatch.readAt ? (
                          <span className="text-green-700">{formatDateTime(dispatch.readAt)}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Sin confirmar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`gap-1 text-xs ${statusInfo.className}`}>
                          {statusInfo.icon}{statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {dispatch.minuteId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => setLocation(`/meeting-minutes/${dispatch.minuteId}`)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver minuta</TooltipContent>
                            </Tooltip>
                          )}
                          {dispatch.recipientId && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={() => setLocation(`/committee/minute-recipients/${dispatch.recipientId}/history`)}
                                >
                                  <History className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Historial del destinatario</TooltipContent>
                            </Tooltip>
                          )}
                          {dispatch.status !== "read" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => markAsReadMutation.mutate({ dispatchId: dispatch.id })}
                                  disabled={markAsReadMutation.isPending}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Marcar como leído</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Mostrando {((pagination.page - 1) * pagination.pageSize) + 1}–{Math.min(pagination.page * pagination.pageSize, pagination.total)} de {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs px-2">{pagination.page} / {pagination.totalPages}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
