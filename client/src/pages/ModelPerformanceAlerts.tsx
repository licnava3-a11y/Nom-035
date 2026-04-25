import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, TrendingDown, Clock, AlertCircle, FileDown, FileText, Sheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Helpers de exportación ──────────────────────────────────────────────────

async function exportToXLSX(alertHistory: any[], stats: any) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen
  const summaryData = [
    ["Reporte de Alertas — Rendimiento del Modelo Predictivo"],
    ["Generado:", new Date().toLocaleString("es-MX")],
    [],
    ["RESUMEN"],
    ["Alertas Activas", stats?.active ?? 0],
    ["Alertas Críticas", stats?.bySeverity?.critical ?? 0],
    ["Alertas Resueltas", stats?.resolved ?? 0],
    ["Total Histórico", stats?.total ?? 0],
    [],
    ["DISTRIBUCIÓN POR MÉTRICA"],
    ["Precisión", stats?.byMetric?.precision ?? 0],
    ["Recall", stats?.byMetric?.recall ?? 0],
    ["F1-Score", stats?.byMetric?.f1Score ?? 0],
    ["Accuracy", stats?.byMetric?.accuracy ?? 0],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

  // Hoja 2: Historial
  const historyRows = alertHistory.map((a: any) => ({
    Fecha: format(new Date(a.createdAt), "dd/MM/yyyy HH:mm"),
    Métrica: getMetricLabelStr(a.metricName),
    Severidad: a.severity,
    "Valor Actual (%)": a.currentValue,
    "Umbral (%)": a.thresholdValue,
    Estado: a.isResolved ? "Resuelta" : "Activa",
    Mensaje: a.message ?? "",
    Recomendación: a.recommendation ?? "",
  }));
  const wsHistory = XLSX.utils.json_to_sheet(historyRows);
  XLSX.utils.book_append_sheet(wb, wsHistory, "Historial de Alertas");

  XLSX.writeFile(wb, `alertas-modelo-predictivo-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  toast.success("Archivo XLSX generado correctamente");
}

async function exportToPDF(alertHistory: any[], stats: any) {
  const { jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, pageW, 18, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Alertas de Rendimiento del Modelo Predictivo", pageW / 2, 11, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, pageW / 2, 16, { align: "center" });

  // KPIs
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen Ejecutivo", 14, 26);
  const kpis = [
    ["Alertas Activas", String(stats?.active ?? 0)],
    ["Alertas Críticas", String(stats?.bySeverity?.critical ?? 0)],
    ["Alertas Resueltas", String(stats?.resolved ?? 0)],
    ["Total Histórico", String(stats?.total ?? 0)],
  ];
  autoTable(doc, {
    startY: 29,
    head: [["Indicador", "Valor"]],
    body: kpis,
    theme: "grid",
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
    columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 30, halign: "center" } },
    margin: { left: 14 },
    tableWidth: 95,
  });

  // Historial
  const finalY = (doc as any).lastAutoTable?.finalY ?? 60;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Historial de Alertas", 14, finalY + 10);

  const rows = alertHistory.map((a: any) => [
    format(new Date(a.createdAt), "dd/MM/yy HH:mm"),
    getMetricLabelStr(a.metricName),
    a.severity,
    `${a.currentValue}%`,
    `${a.thresholdValue}%`,
    a.isResolved ? "Resuelta" : "Activa",
  ]);

  autoTable(doc, {
    startY: finalY + 13,
    head: [["Fecha", "Métrica", "Severidad", "Valor", "Umbral", "Estado"]],
    body: rows,
    theme: "striped",
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 5) {
        if (data.cell.raw === "Activa") {
          data.cell.styles.textColor = [180, 60, 0];
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
  });

  doc.save(`alertas-modelo-predictivo-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  toast.success("Archivo PDF generado correctamente");
}

async function exportToWord(alertHistory: any[], stats: any) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
  } = await import("docx");

  const makeBoldCell = (text: string) =>
    new TableCell({
      children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
    });
  const makeCell = (text: string) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text })] })] });

  const historyTableRows = [
    new TableRow({
      children: ["Fecha", "Métrica", "Severidad", "Valor", "Umbral", "Estado"].map(makeBoldCell),
    }),
    ...alertHistory.map(
      (a: any) =>
        new TableRow({
          children: [
            format(new Date(a.createdAt), "dd/MM/yyyy HH:mm"),
            getMetricLabelStr(a.metricName),
            a.severity,
            `${a.currentValue}%`,
            `${a.thresholdValue}%`,
            a.isResolved ? "Resuelta" : "Activa",
          ].map(makeCell),
        })
    ),
  ];

  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Alertas de Rendimiento del Modelo Predictivo",
            heading: HeadingLevel.HEADING_1,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Generado: ", bold: true }),
              new TextRun({ text: new Date().toLocaleString("es-MX") }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Resumen Ejecutivo", heading: HeadingLevel.HEADING_2 }),
          new Paragraph({
            children: [
              new TextRun({ text: "Alertas Activas: ", bold: true }),
              new TextRun({ text: String(stats?.active ?? 0) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Alertas Críticas: ", bold: true }),
              new TextRun({ text: String(stats?.bySeverity?.critical ?? 0) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Alertas Resueltas: ", bold: true }),
              new TextRun({ text: String(stats?.resolved ?? 0) }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Total Histórico: ", bold: true }),
              new TextRun({ text: String(stats?.total ?? 0) }),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({ text: "Historial de Alertas", heading: HeadingLevel.HEADING_2 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: historyTableRows,
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `alertas-modelo-predictivo-${format(new Date(), "yyyy-MM-dd")}.docx`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Archivo Word generado correctamente");
}

// ─── Helpers de etiquetas ────────────────────────────────────────────────────

function getMetricLabelStr(metricName: string): string {
  switch (metricName) {
    case "precision": return "Precisión";
    case "recall": return "Recall";
    case "f1Score": return "F1-Score";
    case "accuracy": return "Accuracy";
    default: return metricName;
  }
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function ModelPerformanceAlerts() {
  const { data: activeAlerts = [], isLoading: loadingActive, refetch: refetchActive } = trpc.modelPerformanceAlerts.getActiveAlerts.useQuery();
  const { data: alertHistory = [], isLoading: loadingHistory, refetch: refetchHistory } = trpc.modelPerformanceAlerts.getAlertHistory.useQuery({ limit: 50 });
  const { data: stats, isLoading: loadingStats } = trpc.modelPerformanceAlerts.getAlertStats.useQuery();

  const resolveAlertMutation = trpc.modelPerformanceAlerts.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta marcada como resuelta");
      refetchActive();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.message || "Error al resolver alerta");
    },
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive" className="bg-red-600">Crítico</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-600">Alto</Badge>;
      case "medium":
        return <Badge className="bg-yellow-600">Medio</Badge>;
      case "low":
        return <Badge variant="secondary">Bajo</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  if (loadingActive || loadingHistory || loadingStats) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando alertas...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Encabezado con botones de exportación */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Alertas de Rendimiento del Modelo Predictivo</h1>
          <p className="text-muted-foreground mt-2">
            Monitoreo automático de métricas del modelo con alertas cuando caen por debajo de umbrales críticos
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToXLSX(alertHistory, stats)}
            className="gap-2"
          >
            <Sheet className="h-4 w-4 text-green-600" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToPDF(alertHistory, stats)}
            className="gap-2"
          >
            <FileDown className="h-4 w-4 text-red-600" />
            PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportToWord(alertHistory, stats)}
            className="gap-2"
          >
            <FileText className="h-4 w-4 text-blue-600" />
            Word
          </Button>
        </div>
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div className="text-2xl font-bold">{stats?.active || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div className="text-2xl font-bold">{stats?.bySeverity.critical || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Resueltas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{stats?.resolved || 0}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Histórico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas por Métrica */}
      {stats && stats.active > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Alertas Activas por Métrica</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.byMetric.precision}</div>
                <div className="text-sm text-muted-foreground">Precisión</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.byMetric.recall}</div>
                <div className="text-sm text-muted-foreground">Recall</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.byMetric.f1Score}</div>
                <div className="text-sm text-muted-foreground">F1-Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.byMetric.accuracy}</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs de Alertas */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Alertas Activas ({activeAlerts.length})</TabsTrigger>
          <TabsTrigger value="history">Historial ({alertHistory.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium">No hay alertas activas</p>
                <p className="text-muted-foreground">Todas las métricas del modelo están dentro de los umbrales aceptables</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeAlerts.map((alert: any) => (
                <Card key={alert.id} className="border-l-4 border-l-orange-600">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{getMetricLabelStr(alert.metricName)}</CardTitle>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <CardDescription className="text-sm">
                          {format(new Date(alert.createdAt), "PPP 'a las' HH:mm", { locale: es })}
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => resolveAlertMutation.mutate({ alertId: alert.id })}
                        disabled={resolveAlertMutation.isPending}
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Marcar como Resuelta
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Valor Actual:</span>{" "}
                        <span className="font-medium text-red-600">{alert.currentValue}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Umbral Crítico:</span>{" "}
                        <span className="font-medium">{alert.thresholdValue}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Mensaje:</p>
                      <p className="text-sm text-muted-foreground">{alert.message}</p>
                    </div>
                    {alert.recommendation && (
                      <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md">
                        <p className="text-sm font-medium mb-1 text-blue-900 dark:text-blue-100">Recomendación:</p>
                        <p className="text-sm text-blue-800 dark:text-blue-200">{alert.recommendation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Historial de Alertas</CardTitle>
                  <CardDescription>Últimas 50 alertas generadas por el sistema</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportToXLSX(alertHistory, stats)} className="gap-1">
                    <Sheet className="h-3 w-3 text-green-600" />
                    XLSX
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToPDF(alertHistory, stats)} className="gap-1">
                    <FileDown className="h-3 w-3 text-red-600" />
                    PDF
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => exportToWord(alertHistory, stats)} className="gap-1">
                    <FileText className="h-3 w-3 text-blue-600" />
                    Word
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Métrica</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Umbral</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertHistory.map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell className="text-sm">
                        {format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell>{getMetricLabelStr(alert.metricName)}</TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell className="font-medium">{alert.currentValue}%</TableCell>
                      <TableCell>{alert.thresholdValue}%</TableCell>
                      <TableCell>
                        {alert.isResolved ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resuelta
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <AlertTriangle className="mr-1 h-3 w-3" />
                            Activa
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
