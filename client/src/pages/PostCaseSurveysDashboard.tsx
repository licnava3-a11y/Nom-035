/**
 * Dashboard de Encuestas Post-Caso
 * Visualización de resultados y efectividad de intervenciones NOM-035
 * Con filtros avanzados (período, departamento, fechas) y exportación a Excel
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Clock, XCircle, Send, TrendingUp, Star, Download, Filter, RefreshCw, FileText } from "lucide-react";
import { Chart, registerables } from "chart.js";
import { toast } from "sonner";
import { loadXlsx } from "@/lib/loadXlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Registrar componentes de Chart.js
Chart.register(...registerables);

export default function PostCaseSurveysDashboard() {
  // Filtros
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "sent" | "completed" | "expired" | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<"30" | "60" | "90" | undefined>();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>();
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const effectivenessChartRef = useRef<HTMLCanvasElement>(null);
  const periodComparisonChartRef = useRef<HTMLCanvasElement>(null);
  const effectivenessChartInstance = useRef<Chart | null>(null);
  const periodComparisonChartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.postCaseSurveys.getEffectivenessStats.useQuery();
  const { data: surveys, isLoading: surveysLoading, refetch: refetchSurveys } = trpc.postCaseSurveys.getAllSurveys.useQuery({
    status: selectedStatus,
    period: selectedPeriod,
    departmentId: selectedDepartmentId,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });
  const { data: departmentsData } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });
  const departments = departmentsData?.data;

  // Mutations para jobs
  const createPendingSurveysMutation = trpc.postCaseSurveys.createPendingSurveys.useMutation({
    onSuccess: (result: any) => {
      toast.success(`✅ ${result.surveysCreated} encuestas creadas`);
      refetchSurveys();
    },
    onError: () => toast.error("❌ Error al crear encuestas pendientes"),
  });
  const sendPendingSurveysMutation = trpc.postCaseSurveys.sendPendingSurveys.useMutation({
    onSuccess: (result: any) => {
      toast.success(`✅ ${result.surveysSent} encuestas enviadas`);
      refetchSurveys();
    },
    onError: () => toast.error("❌ Error al enviar encuestas"),
  });
  const expireSurveysMutation = trpc.postCaseSurveys.expireSurveys.useMutation({
    onSuccess: (result: any) => {
      toast.success(`✅ ${result.surveysExpired} encuestas expiradas`);
      refetchSurveys();
    },
    onError: () => toast.error("❌ Error al expirar encuestas"),
  });

  // Renderizar gráfico de efectividad (barras horizontales en lugar de radar)
  useEffect(() => {
    if (!stats || !effectivenessChartRef.current) return;
    if (effectivenessChartInstance.current) effectivenessChartInstance.current.destroy();
    const ctx = effectivenessChartRef.current.getContext("2d");
    if (!ctx) return;

    effectivenessChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Mejora de situación", "Satisfacción con resolución", "Apoyo recibido", "Recomendaría el proceso"],
        datasets: [{
          label: "Promedio (1-5)",
          data: [stats.avgImprovement, stats.avgSatisfaction, stats.avgSupport, stats.avgRecommendation],
          backgroundColor: ["rgba(34,197,94,0.8)", "rgba(59,130,246,0.8)", "rgba(168,85,247,0.8)", "rgba(245,158,11,0.8)"],
          borderColor: ["rgba(34,197,94,1)", "rgba(59,130,246,1)", "rgba(168,85,247,1)", "rgba(245,158,11,1)"],
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { beginAtZero: true, max: 5, ticks: { stepSize: 1 } },
        },
        plugins: { legend: { display: false } },
      },
    });
    return () => { if (effectivenessChartInstance.current) effectivenessChartInstance.current.destroy(); };
  }, [stats]);

  // Renderizar gráfico de comparación por período
  useEffect(() => {
    if (!stats || !periodComparisonChartRef.current) return;
    if (periodComparisonChartInstance.current) periodComparisonChartInstance.current.destroy();
    const ctx = periodComparisonChartRef.current.getContext("2d");
    if (!ctx) return;

    periodComparisonChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["30 días", "60 días", "90 días"],
        datasets: [{
          label: "Score Promedio",
          data: [stats.byPeriod["30"].avgScore, stats.byPeriod["60"].avgScore, stats.byPeriod["90"].avgScore],
          backgroundColor: ["rgba(34,197,94,0.8)", "rgba(59,130,246,0.8)", "rgba(168,85,247,0.8)"],
          borderColor: ["rgba(34,197,94,1)", "rgba(59,130,246,1)", "rgba(168,85,247,1)"],
          borderWidth: 2,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, max: 5, ticks: { stepSize: 1 }, title: { display: true, text: "Score (1-5)" } },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const period = ["30", "60", "90"][context.dataIndex];
                const count = stats.byPeriod[period as "30" | "60" | "90"].count;
                return `Encuestas completadas: ${count}`;
              },
            },
          },
        },
      },
    });
    return () => { if (periodComparisonChartInstance.current) periodComparisonChartInstance.current.destroy(); };
  }, [stats]);

  // Exportar a Excel
  const handleExportExcel = async () => {
    if (!surveys || surveys.length === 0) {
      toast.error("No hay datos para exportar con los filtros actuales");
      return;
    }
    setIsExporting(true);
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.utils.book_new();

      // Hoja 1: Listado completo de encuestas
      const surveyRows = surveys.map((item: any) => {
        const avgScore = item.survey.improvementRating
          ? ((item.survey.improvementRating + item.survey.satisfactionRating + item.survey.supportRating + item.survey.recommendationRating) / 4).toFixed(2)
          : "";
        return {
          "Número de Caso": item.caseNumber,
          "Tipo de Caso": item.caseType,
          "Período (días)": item.survey.daysSinceClosure,
          "Estado": item.survey.status,
          "Fecha Creación": item.survey.createdAt ? new Date(item.survey.createdAt).toLocaleDateString("es-MX") : "",
          "Fecha Envío": item.survey.sentAt ? new Date(item.survey.sentAt).toLocaleDateString("es-MX") : "",
          "Fecha Completada": item.survey.completedAt ? new Date(item.survey.completedAt).toLocaleDateString("es-MX") : "",
          "Mejora (1-5)": item.survey.improvementRating || "",
          "Satisfacción (1-5)": item.survey.satisfactionRating || "",
          "Apoyo (1-5)": item.survey.supportRating || "",
          "Recomendación (1-5)": item.survey.recommendationRating || "",
          "Score Promedio": avgScore,
          "Comentarios": item.survey.comments || "",
        };
      });
      const ws1 = XLSX.utils.json_to_sheet(surveyRows);
      ws1["!cols"] = [
        { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 16 },
        { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 },
        { wch: 16 }, { wch: 14 }, { wch: 40 },
      ];
      XLSX.utils.book_append_sheet(wb, ws1, "Encuestas");

      // Hoja 2: Resumen de efectividad
      if (stats) {
        const summaryRows = [
          { "Métrica": "Total Completadas", "Valor": stats.totalCompleted },
          { "Métrica": "Score General (1-5)", "Valor": stats.overallScore },
          { "Métrica": "Promedio Mejora", "Valor": stats.avgImprovement },
          { "Métrica": "Promedio Satisfacción", "Valor": stats.avgSatisfaction },
          { "Métrica": "Promedio Apoyo", "Valor": stats.avgSupport },
          { "Métrica": "Promedio Recomendación", "Valor": stats.avgRecommendation },
          { "Métrica": "", "Valor": "" },
          { "Métrica": "Encuestas completadas 30 días", "Valor": stats.byPeriod["30"].count },
          { "Métrica": "Score promedio 30 días", "Valor": stats.byPeriod["30"].avgScore },
          { "Métrica": "Encuestas completadas 60 días", "Valor": stats.byPeriod["60"].count },
          { "Métrica": "Score promedio 60 días", "Valor": stats.byPeriod["60"].avgScore },
          { "Métrica": "Encuestas completadas 90 días", "Valor": stats.byPeriod["90"].count },
          { "Métrica": "Score promedio 90 días", "Valor": stats.byPeriod["90"].avgScore },
        ];
        const ws2 = XLSX.utils.json_to_sheet(summaryRows);
        ws2["!cols"] = [{ wch: 35 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Resumen Efectividad");
      }

      // Generar y descargar el archivo
      const today = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Encuestas_PostCaso_NOM035_${today}.xlsx`);
      toast.success("✅ Archivo Excel generado correctamente");
    } catch (err) {
      toast.error("❌ Error al generar el archivo Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // Exportar a PDF
  const handleExportPDF = async () => {
    if (!surveys || surveys.length === 0) {
      toast.error("No hay datos para exportar con los filtros actuales");
      return;
    }
    setIsExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const today = new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
      // --- Encabezado ---
      doc.setFillColor(15, 23, 42); // navy
      doc.rect(0, 0, 297, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte de Encuestas Post-Caso — NOM-035 STPS 2018", 14, 10);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generado el ${today}`, 14, 17);
      // --- Resumen ejecutivo ---
      if (stats) {
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Resumen Ejecutivo", 14, 32);
        const summaryData = [
          ["Total Completadas", String(stats.totalCompleted), "Score General (1-5)", String(stats.overallScore)],
          ["Promedio Mejora", String(stats.avgImprovement), "Promedio Satisfacción", String(stats.avgSatisfaction)],
          ["Promedio Apoyo", String(stats.avgSupport), "Promedio Recomendación", String(stats.avgRecommendation)],
        ];
        autoTable(doc, {
          startY: 35,
          head: [["Métrica", "Valor", "Métrica", "Valor"]],
          body: summaryData,
          theme: "grid",
          headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 25 }, 2: { cellWidth: 55 }, 3: { cellWidth: 25 } },
          margin: { left: 14, right: 14 },
        });
        // Comparación por período
        const periodY = (doc as any).lastAutoTable.finalY + 8;
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Efectividad por Período de Seguimiento", 14, periodY);
        const periodData = Object.entries(stats.byPeriod).map(([days, data]: [string, any]) => [
          `${days} días`, String(data.count), String(data.avgScore),
        ]);
        autoTable(doc, {
          startY: periodY + 3,
          head: [["Período", "Encuestas Completadas", "Score Promedio"]],
          body: periodData,
          theme: "striped",
          headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold", fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 50 }, 2: { cellWidth: 40 } },
          margin: { left: 14, right: 14 },
        });
      }
      // --- Tabla de encuestas ---
      doc.addPage();
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 14, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Listado Detallado de Encuestas", 14, 10);
      const tableRows = surveys.map((item: any) => {
        const avgScore = item.survey.improvementRating
          ? ((item.survey.improvementRating + item.survey.satisfactionRating + item.survey.supportRating + item.survey.recommendationRating) / 4).toFixed(1)
          : "—";
        return [
          item.caseNumber || "—",
          item.caseType || "—",
          item.survey.daysSinceClosure ? `${item.survey.daysSinceClosure}d` : "—",
          item.survey.status || "—",
          item.survey.completedAt ? new Date(item.survey.completedAt).toLocaleDateString("es-MX") : "—",
          item.survey.improvementRating || "—",
          item.survey.satisfactionRating || "—",
          item.survey.supportRating || "—",
          item.survey.recommendationRating || "—",
          avgScore,
          item.survey.comments ? item.survey.comments.substring(0, 60) + (item.survey.comments.length > 60 ? "..." : "") : "—",
        ];
      });
      autoTable(doc, {
        startY: 18,
        head: [["No. Caso", "Tipo", "Período", "Estado", "Completada", "Mejora", "Satisf.", "Apoyo", "Recom.", "Score", "Comentarios"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 7 },
        bodyStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 22 }, 1: { cellWidth: 22 }, 2: { cellWidth: 16 }, 3: { cellWidth: 20 },
          4: { cellWidth: 22 }, 5: { cellWidth: 14 }, 6: { cellWidth: 14 }, 7: { cellWidth: 14 },
          8: { cellWidth: 14 }, 9: { cellWidth: 14 }, 10: { cellWidth: 55 },
        },
        margin: { left: 14, right: 14 },
      });
      // Pie de página
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${pageCount} — Plataforma NOM-035 STPS 2018 — Confidencial`, 14, 205);
      }
      const dateStr = new Date().toISOString().split("T")[0];
      doc.save(`Encuestas_PostCaso_NOM035_${dateStr}.pdf`);
      toast.success("✅ PDF generado correctamente");
    } catch (err) {
      toast.error("❌ Error al generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const clearFilters = () => {
    setSelectedStatus(undefined);
    setSelectedPeriod(undefined);
    setSelectedDepartmentId(undefined);
    setStartDate("");
    setEndDate("");
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pendiente", icon: Clock },
      sent: { variant: "default", label: "Enviada", icon: Send },
      completed: { variant: "outline", label: "Completada", icon: CheckCircle2 },
      expired: { variant: "destructive", label: "Expirada", icon: XCircle },
    };
    const { variant, label, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  const hasActiveFilters = selectedStatus || selectedPeriod || selectedDepartmentId || startDate || endDate;

  if (statsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando dashboard de encuestas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudieron cargar las estadísticas</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encuestas Post-Caso</h1>
          <p className="text-muted-foreground mt-1">
            Seguimiento automático 30/60/90 días después de cierre de casos NOM-035
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => createPendingSurveysMutation.mutate({})}
            disabled={createPendingSurveysMutation.isPending}
          >
            Crear Pendientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendPendingSurveysMutation.mutate()}
            disabled={sendPendingSurveysMutation.isPending}
          >
            Enviar Pendientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => expireSurveysMutation.mutate()}
            disabled={expireSurveysMutation.isPending}
          >
            Expirar Vencidas
          </Button>
          <Button
            size="sm"
            onClick={handleExportExcel}
            disabled={isExporting || !surveys || surveys.length === 0}
            className="bg-green-700 hover:bg-green-800 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button
            size="sm"
            onClick={handleExportPDF}
            disabled={isExporting || !surveys || surveys.length === 0}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            {isExporting ? "Generando..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Completadas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Score General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{stats.overallScore}</p>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={`h-3 w-3 ${i < Math.round(stats.overallScore) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mejora</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgImprovement}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Satisfacción</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgSatisfaction}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recomendación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgRecommendation}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Efectividad por Categoría</CardTitle>
            <CardDescription>Promedio de ratings en escala 1-5</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 280 }}>
              <canvas ref={effectivenessChartRef}></canvas>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comparación por Período</CardTitle>
            <CardDescription>Score promedio según días transcurridos desde cierre</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: 240 }}>
              <canvas ref={periodComparisonChartRef}></canvas>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
              <div>
                <p className="font-semibold text-green-600">{stats.byPeriod["30"].count}</p>
                <p className="text-muted-foreground">30 días</p>
              </div>
              <div>
                <p className="font-semibold text-blue-600">{stats.byPeriod["60"].count}</p>
                <p className="text-muted-foreground">60 días</p>
              </div>
              <div>
                <p className="font-semibold text-purple-600">{stats.byPeriod["90"].count}</p>
                <p className="text-muted-foreground">90 días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros avanzados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <CardTitle className="text-base">Filtros Avanzados</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="text-xs">
                  Filtros activos
                </Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Limpiar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select
                value={selectedStatus || "all"}
                onValueChange={(v) => setSelectedStatus(v === "all" ? undefined : v as any)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="expired">Expirada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Período</Label>
              <Select
                value={selectedPeriod || "all"}
                onValueChange={(v) => setSelectedPeriod(v === "all" ? undefined : v as any)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los períodos</SelectItem>
                  <SelectItem value="30">30 días</SelectItem>
                  <SelectItem value="60">60 días</SelectItem>
                  <SelectItem value="90">90 días</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Departamento</Label>
              <Select
                value={selectedDepartmentId?.toString() || "all"}
                onValueChange={(v) => setSelectedDepartmentId(v === "all" ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {(departments || []).map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Fecha inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Fecha fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Listado de encuestas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Listado de Encuestas</CardTitle>
              <CardDescription>
                {surveysLoading ? "Cargando..." : `${surveys?.length || 0} encuestas encontradas`}
                {hasActiveFilters && " (con filtros aplicados)"}
              </CardDescription>
            </div>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando encuestas...</div>
          ) : surveys && surveys.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-2 font-medium">Caso</th>
                    <th className="text-left p-2 font-medium">Tipo</th>
                    <th className="text-center p-2 font-medium">Período</th>
                    <th className="text-center p-2 font-medium">Estado</th>
                    <th className="text-center p-2 font-medium">Enviada</th>
                    <th className="text-center p-2 font-medium">Completada</th>
                    <th className="text-center p-2 font-medium">Score</th>
                    <th className="text-left p-2 font-medium">Comentarios</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((item: any) => {
                    const avgScore = item.survey.improvementRating
                      ? (((item.survey.improvementRating || 0) + (item.survey.satisfactionRating || 0) + (item.survey.supportRating || 0) + (item.survey.recommendationRating || 0)) / 4).toFixed(1)
                      : "-";
                    const scoreNum = parseFloat(avgScore);
                    const scoreColor = isNaN(scoreNum) ? "" : scoreNum >= 4 ? "text-green-600 font-bold" : scoreNum >= 3 ? "text-amber-600 font-bold" : "text-red-600 font-bold";

                    return (
                      <tr key={item.survey.id} className="border-b hover:bg-muted/40 transition-colors">
                        <td className="p-2 font-medium">{item.caseNumber}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">{item.caseType}</Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="secondary" className="text-xs">{item.survey.daysSinceClosure} días</Badge>
                        </td>
                        <td className="text-center p-2">{getStatusBadge(item.survey.status)}</td>
                        <td className="text-center p-2 text-xs text-muted-foreground">
                          {item.survey.sentAt ? new Date(item.survey.sentAt).toLocaleDateString("es-MX") : "-"}
                        </td>
                        <td className="text-center p-2 text-xs text-muted-foreground">
                          {item.survey.completedAt ? new Date(item.survey.completedAt).toLocaleDateString("es-MX") : "-"}
                        </td>
                        <td className={`text-center p-2 ${scoreColor}`}>{avgScore}</td>
                        <td className="p-2 text-xs text-muted-foreground max-w-xs truncate">
                          {item.survey.comments || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No hay encuestas con los filtros aplicados</p>
              {hasActiveFilters && (
                <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                  Limpiar filtros
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funcionamiento del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• <strong>Creación automática:</strong> El job detecta casos cerrados que cumplan 30, 60 o 90 días y crea encuestas pendientes automáticamente.</p>
          <p>• <strong>Envío:</strong> El job "Enviar Pendientes" envía correos HTML a los reportantes con un enlace único para responder sin login. Recordatorio automático a los 3 días si no hay respuesta.</p>
          <p>• <strong>Expiración:</strong> Las encuestas no respondidas en 7 días se marcan como expiradas automáticamente.</p>
          <p>• <strong>Ratings:</strong> Cada encuesta mide 4 aspectos en escala 1-5: Mejora de la situación, Satisfacción con la resolución, Apoyo recibido y Recomendación del proceso.</p>
          <p>• <strong>Exportación:</strong> El botón "Exportar Excel" genera un archivo .xlsx con dos hojas: listado completo de encuestas y resumen de efectividad para reportes NOM-035 ante la STPS.</p>
        </CardContent>
      </Card>
    </div>
  );
}
