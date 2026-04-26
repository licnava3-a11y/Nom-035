import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, Info, Download, Calendar, FileText, Printer, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";
import { useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type AlertType = "critical_cases" | "low_coverage" | "excellent_compliance" | "all";
type AlertStatus = "active" | "resolved" | "all";
type AlertPriority = "critical" | "warning" | "info" | "all";

const PAGE_SIZE = 20;

function TrendChart() {
  const [months, setMonths] = useState<3 | 6 | 12>(12);
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: trendData, isLoading } = trpc.alerts.getMonthlyByPriority.useQuery({ months });

  const exportPNG = () => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
      }
      URL.revokeObjectURL(url);
      const link = document.createElement("a");
      link.download = `tendencia-alertas-${months}meses.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = url;
  };

  if (isLoading) return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">Cargando tendencia...</div>;
  if (!trendData || trendData.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
        <p className="text-sm">Sin datos de tendencia disponibles</p>
        <p className="text-xs mt-1">Los datos aparecerán conforme se registren alertas en el sistema</p>
      </div>
    );
  }

  const formatted = trendData.map((d) => ({
    mes: d.month,
    Críticas: d.critical,
    Advertencias: d.warning,
    Informativas: d.info,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {([3, 6, 12] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMonths(m)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                months === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary"
              }`}
            >
              {m} meses
            </button>
          ))}
        </div>
        <button
          onClick={exportPNG}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md border border-border bg-background hover:bg-muted transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          Exportar PNG
        </button>
      </div>
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formatted} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Críticas" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Advertencias" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="Informativas" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AlertHistory() {
  const [alertType, setAlertType] = useState<AlertType>("all");
  const [status, setStatus] = useState<AlertStatus>("all");
  const [priority, setPriority] = useState<AlertPriority>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingAll, setIsExportingAll] = useState(false);

  const utils = trpc.useUtils();

  // Resetear página al cambiar filtros
  const handleAlertTypeChange = (v: AlertType) => { setAlertType(v); setCurrentPage(1); };
  const handleStatusChange = (v: AlertStatus) => { setStatus(v); setCurrentPage(1); };
  const handlePriorityChange = (v: AlertPriority) => { setPriority(v); setCurrentPage(1); };
  const handleStartDateChange = (d: Date | undefined) => { setStartDate(d); setCurrentPage(1); };
  const handleEndDateChange = (d: Date | undefined) => { setEndDate(d); setCurrentPage(1); };

  // Query para obtener histórico paginado
  const { data: historyData, isLoading } = trpc.alerts.getHistory.useQuery({
    alertType: alertType === "all" ? undefined : alertType,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  const alerts = historyData?.alerts ?? [];
  const total = historyData?.total ?? 0;
  const totalPages = historyData?.totalPages ?? 1;

  // Mutation para resolver alerta
  const resolveMutation = trpc.alerts.resolve.useMutation({
    onSuccess: () => {
      utils.alerts.getHistory.invalidate();
      setResolveDialogOpen(false);
      setNotes("");
      setSelectedAlertId(null);
    },
  });

  const handleResolve = (alertId: number) => {
    setSelectedAlertId(alertId);
    setResolveDialogOpen(true);
  };

  const confirmResolve = () => {
    if (selectedAlertId) {
      resolveMutation.mutate({
        alertId: selectedAlertId,
        notes: notes || undefined,
      });
    }
  };

  const handleExportToWord = async () => {
    if (!alerts || alerts.length === 0) return;
    try {
      const headerCells = ["Fecha", "Tipo", "Prioridad", "Descripción", "Estado"].map(
        (h) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })
      );
      const dataRows = alerts.map((alert: any) =>
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(new Date(alert.triggeredAt).toLocaleString("es-MX"))] }),
            new TableCell({ children: [new Paragraph(getAlertTypeLabel(alert.alertType))] }),
            new TableCell({ children: [new Paragraph(alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa")] }),
            new TableCell({ children: [new Paragraph(alert.description ?? "")] }),
            new TableCell({ children: [new Paragraph(alert.status === "active" ? "Activa" : "Resuelta")] }),
          ],
        })
      );
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: "Histórico de Alertas — NOM-035 STPS", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Generado: ${new Date().toLocaleString("es-MX")}`, alignment: AlignmentType.LEFT }),
            new Paragraph({ text: `Total de registros: ${total}`, alignment: AlignmentType.LEFT }),
            new Paragraph(""),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [new TableRow({ children: headerCells, tableHeader: true }), ...dataRows],
            }),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `historico_alertas_${new Date().toISOString().split("T")[0]}.docx`);
      toast({ title: "Word exportado", description: "El archivo .docx fue descargado." });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el archivo Word.", variant: "destructive" });
    }
  };

  const handleExportToPDF = () => {
    if (!alerts || alerts.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const rows = alerts.map((alert: any) => `
      <tr>
        <td>${new Date(alert.triggeredAt).toLocaleString("es-MX")}</td>
        <td>${getAlertTypeLabel(alert.alertType)}</td>
        <td>${alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa"}</td>
        <td>${alert.description ?? ""}</td>
        <td>${alert.status === "active" ? "Activa" : "Resuelta"}</td>
      </tr>`).join("");
    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Histórico de Alertas</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;margin:20px}h1{font-size:16px;margin-bottom:4px}p{margin:2px 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:5px 8px;text-align:left}th{background:#f0f0f0;font-weight:bold}tr:nth-child(even){background:#f9f9f9}</style>
      </head><body><h1>Histórico de Alertas &mdash; NOM-035 STPS</h1><p>Generado: ${new Date().toLocaleString("es-MX")}</p><p>Total de registros: ${total}</p>
      <table><thead><tr><th>Fecha</th><th>Tipo</th><th>Prioridad</th><th>Descripción</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
  };

  const handleExportToExcel = () => {
    if (!alerts || alerts.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Hoja de Metadatos
    const metadata = [
      ["Histórico de Alertas - Plataforma NOM-035"],
      [""],
      ["Fecha de Exportación:", new Date().toLocaleString("es-MX")],
      ["Filtros Aplicados:"],
      ["  Tipo de Alerta:", alertType === "all" ? "Todas" : getAlertTypeLabel(alertType)],
      ["  Estado:", status === "all" ? "Todos" : status === "active" ? "Activas" : "Resueltas"],
      ["  Prioridad:", priority === "all" ? "Todas" : priority === "critical" ? "Crítica" : priority === "warning" ? "Advertencia" : "Información"],
      [""],
      ["Estadísticas (página actual):"],
      ["  Registros en esta página:", alerts.length],
      ["  Total de registros:", total],
      ["  Alertas Activas (página):", alerts.filter((a: any) => a.status === "active").length],
      ["  Alertas Resueltas (página):", alerts.filter((a: any) => a.status === "resolved").length],
    ];
    const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(wb, wsMetadata, "Metadatos");

    // Hoja de Datos
    const data = alerts.map((alert: any) => ({
      "Fecha": new Date(alert.triggeredAt).toLocaleString("es-MX"),
      "Tipo": getAlertTypeLabel(alert.alertType),
      "Prioridad": alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa",
      "Descripción": alert.description,
      "Umbral": alert.threshold,
      "Valor Actual": alert.currentValue,
      "Estado": alert.status === "active" ? "Activa" : "Resuelta",
      "Fecha Resolución": alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString("es-MX") : "N/A",
      "Notas": alert.notes || "N/A",
    }));
    const wsData = XLSX.utils.json_to_sheet(data);
    
    const colWidths = [
      { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 50 },
      { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 40 },
    ];
    wsData["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, wsData, "Alertas");

    const fileName = `historico_alertas_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleExportAllToExcel = async () => {
    setIsExportingAll(true);
    try {
      const allAlerts = await utils.client.systemSettings.getAllAlertsForExport.query({
        status: status === "all" ? "all" : status,
        alertType: alertType === "all" ? undefined : alertType,
        priority: priority === "all" ? undefined : priority,
        dateFrom: startDate ? startDate.toISOString() : undefined,
        dateTo: endDate ? endDate.toISOString() : undefined,
      });
      if (!allAlerts || allAlerts.length === 0) {
        toast({ title: "Sin datos", description: "No hay alertas para exportar con los filtros actuales.", variant: "destructive" });
        return;
      }
      const wb = XLSX.utils.book_new();
      const metadata = [
        ["Histórico Completo de Alertas - Plataforma NOM-035"],
        [""],
        ["Fecha de Exportación:", new Date().toLocaleString("es-MX")],
        ["Total de registros:", allAlerts.length],
        ["Filtros aplicados:"],
        ["  Tipo:", alertType === "all" ? "Todos" : getAlertTypeLabel(alertType)],
        ["  Estado:", status === "all" ? "Todos" : status],
        ["  Prioridad:", priority === "all" ? "Todas" : priority],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(metadata), "Metadatos");
      const rows = allAlerts.map((a: any) => ({
        "Fecha": new Date(a.triggeredAt).toLocaleString("es-MX"),
        "Tipo": getAlertTypeLabel(a.alertType),
        "Prioridad": a.priority === "critical" ? "Crítica" : a.priority === "warning" ? "Advertencia" : "Informativa",
        "Descripción": a.description,
        "Umbral": a.threshold,
        "Valor Actual": a.currentValue,
        "Estado": a.status === "active" ? "Activa" : "Resuelta",
        "Fecha Resolución": a.resolvedAt ? new Date(a.resolvedAt).toLocaleString("es-MX") : "N/A",
        "Notas": a.notes || "N/A",
      }));
      const wsData = XLSX.utils.json_to_sheet(rows);
      wsData["!cols"] = [{ wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 50 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, wsData, "Todas las Alertas");
      XLSX.writeFile(wb, `historico_completo_alertas_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Exportación completa", description: `${allAlerts.length} alertas exportadas a Excel.` });
    } catch (err: any) {
      toast({ title: "Error al exportar", description: err.message || "No se pudo exportar el historial completo.", variant: "destructive" });
    } finally {
      setIsExportingAll(false);
    }
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      critical_cases: "Casos Críticos",
      low_coverage: "Cobertura Baja",
      excellent_compliance: "Cumplimiento Excelente",
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      critical_cases: <AlertCircle className="h-4 w-4 text-red-600" />,
      low_coverage: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      excellent_compliance: <CheckCircle className="h-4 w-4 text-green-600" />,
    };
    return icons[type] || <Info className="h-4 w-4" />;
  };

  const getAlertTypeBadge = (type: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      critical_cases: "destructive",
      low_coverage: "default",
      excellent_compliance: "secondary",
    };
    return variants[type] || "default";
  };

  // Contadores globales por prioridad (del total de la página actual)
  const criticalCount = alerts.filter((a: any) => a.priority === "critical").length;
  const warningCount = alerts.filter((a: any) => a.priority === "warning").length;
  const infoCount = alerts.filter((a: any) => a.priority === "info").length;

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Reportes y Análisis", href: "/reports" },
          { label: "Histórico de Alertas" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Alertas</h1>
        <p className="text-muted-foreground mt-2">
          Registro completo de alertas del sistema para auditoría de cumplimiento NOM-035
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra el histórico por tipo de alerta, estado, prioridad y rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tipo de Alerta</label>
            <Select value={alertType} onValueChange={(v) => handleAlertTypeChange(v as AlertType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical_cases">Casos Críticos</SelectItem>
                <SelectItem value="low_coverage">Cobertura Baja</SelectItem>
                <SelectItem value="excellent_compliance">Cumplimiento Excelente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <Select value={status} onValueChange={(v) => handleStatusChange(v as AlertStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Prioridad</label>
            <Select value={priority} onValueChange={(v) => handlePriorityChange(v as AlertPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="info">Información</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          {/* Rango de Fechas */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-3 block">Rango de Fechas</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Fecha Inicio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={handleStartDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Fecha Fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={handleEndDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Botones de rangos predefinidos */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  handleStartDateChange(weekAgo);
                  handleEndDateChange(now);
                }}
              >
                Última semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  handleStartDateChange(monthAgo);
                  handleEndDateChange(now);
                }}
              >
                Último mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  handleStartDateChange(quarterAgo);
                  handleEndDateChange(now);
                }}
              >
                Último trimestre
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                  handleStartDateChange(yearAgo);
                  handleEndDateChange(now);
                }}
              >
                Último año
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleStartDateChange(undefined);
                  handleEndDateChange(undefined);
                }}
              >
                Limpiar fechas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contadores rápidos por prioridad */}
      {total > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handlePriorityChange(priority === "critical" ? "all" : "critical")}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
              priority === "critical" ? "bg-red-50 border-red-400 ring-2 ring-red-300" : "bg-white border-slate-200 hover:border-red-300 hover:bg-red-50"
            }`}
          >
            <span className="text-2xl font-bold text-red-600">{criticalCount}</span>
            <span className="text-sm font-medium text-red-700">Críticas</span>
          </button>
          <button
            onClick={() => handlePriorityChange(priority === "warning" ? "all" : "warning")}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
              priority === "warning" ? "bg-amber-50 border-amber-400 ring-2 ring-amber-300" : "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50"
            }`}
          >
            <span className="text-2xl font-bold text-amber-600">{warningCount}</span>
            <span className="text-sm font-medium text-amber-700">Advertencias</span>
          </button>
          <button
            onClick={() => handlePriorityChange(priority === "info" ? "all" : "info")}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
              priority === "info" ? "bg-blue-50 border-blue-400 ring-2 ring-blue-300" : "bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50"
            }`}
          >
            <span className="text-2xl font-bold text-blue-600">{infoCount}</span>
            <span className="text-sm font-medium text-blue-700">Informativas</span>
          </button>
        </div>
      )}

      {/* Gráfica de tendencia mensual por prioridad */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual de Alertas por Prioridad</CardTitle>
          <CardDescription>Evolución de alertas críticas, advertencias e informativas en los últimos 12 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart />
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registro de Alertas</CardTitle>
              <CardDescription>
                {total} alerta{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""}
                {priority !== "all" && ` — filtro: ${priority === "critical" ? "Crítica" : priority === "warning" ? "Advertencia" : "Informativa"}`}
                {totalPages > 1 && ` — Página ${currentPage} de ${totalPages}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportToExcel}
                disabled={!alerts || alerts.length === 0}
                variant="outline"
                size="sm"
                className="gap-2"
                title="Exportar página actual"
              >
                <Download className="h-4 w-4" />
                Excel
              </Button>
              {totalPages > 1 && (
                <Button
                  onClick={handleExportAllToExcel}
                  disabled={isExportingAll || total === 0}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-blue-500 text-blue-700 hover:bg-blue-50"
                  title={`Exportar todos los ${total} registros a Excel`}
                >
                  <Download className="h-4 w-4" />
                  {isExportingAll ? "Exportando..." : `Exportar todo (${total})`}
                </Button>
              )}
              <Button
                onClick={handleExportToWord}
                disabled={!alerts || alerts.length === 0}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Word
              </Button>
              <Button
                onClick={handleExportToPDF}
                disabled={!alerts || alerts.length === 0}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Printer className="h-4 w-4" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron alertas con los filtros seleccionados
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Fecha</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-center p-3 font-medium">Prioridad</th>
                      <th className="text-left p-3 font-medium">Descripción</th>
                      <th className="text-center p-3 font-medium">Umbral</th>
                      <th className="text-center p-3 font-medium">Valor Actual</th>
                      <th className="text-center p-3 font-medium">Estado</th>
                      <th className="text-center p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert: any) => (
                      <tr key={alert.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm">
                          {new Date(alert.triggeredAt).toLocaleString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {getAlertTypeIcon(alert.alertType)}
                            <Badge variant={getAlertTypeBadge(alert.alertType)}>
                              {getAlertTypeLabel(alert.alertType)}
                            </Badge>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <Badge 
                            variant={alert.priority === "critical" ? "destructive" : alert.priority === "warning" ? "secondary" : "outline"}
                            className={alert.priority === "info" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}
                          >
                            {alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa"}
                          </Badge>
                        </td>
                        <td className="p-3 text-sm max-w-md">
                          {alert.description}
                          {alert.notes && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              <strong>Notas:</strong> {alert.notes}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center text-sm">{alert.threshold}</td>
                        <td className="p-3 text-center text-sm font-medium">{alert.currentValue}</td>
                        <td className="p-3 text-center">
                          <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                            {alert.status === "active" ? "Activa" : "Resuelta"}
                          </Badge>
                          {alert.status === "resolved" && alert.resolvedAt && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(alert.resolvedAt).toLocaleDateString("es-MX")}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {alert.status === "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResolve(alert.id)}
                            >
                              Resolver
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Controles de paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, total)} de {total} registros
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <span className="text-sm font-medium px-2">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="gap-1"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog para resolver alerta */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Agrega notas sobre las acciones tomadas para resolver esta alerta (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ej: Se revisaron todos los casos críticos y se asignaron responsables. Se programaron sesiones de seguimiento."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={confirmResolve} loading={resolveMutation.isPending} loadingText="Resolviendo...">Resolver Alerta</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
