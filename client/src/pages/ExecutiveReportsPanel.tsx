/**
 * Panel de Reportes Ejecutivos
 * Genera reportes consolidados en PDF con KPIs y métricas del sistema
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { FileText, Download, Calendar, Clock, User, FileBarChart } from "lucide-react";

export default function ExecutiveReportsPanel() {
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "quarterly" | "custom">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const utils = trpc.useUtils();

  // Query: historial de reportes
  const { data: history = [], isLoading: historyLoading } = trpc.executiveReports.getHistory.useQuery({
    limit: 20,
  });

  // Mutation: generar reporte
  const generateReport = trpc.executiveReports.generateReport.useMutation({
    onSuccess: (data) => {
      toast.success(`Reporte generado: ${data.periodLabel}`);
      utils.executiveReports.getHistory.invalidate();
      
      // Descargar automáticamente
      window.open(data.fileUrl, "_blank");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Calcular fechas según tipo de reporte
  const calculateDates = (type: string) => {
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === "weekly") {
      start.setDate(now.getDate() - 7);
    } else if (type === "monthly") {
      start.setMonth(now.getMonth() - 1);
    } else if (type === "quarterly") {
      start.setMonth(now.getMonth() - 3);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  };

  // Manejar cambio de tipo de reporte
  const handleReportTypeChange = (type: "weekly" | "monthly" | "quarterly" | "custom") => {
    setReportType(type);
    if (type !== "custom") {
      const dates = calculateDates(type);
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  };

  // Generar reporte
  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast.error("Selecciona fechas de inicio y fin");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("La fecha de inicio debe ser anterior a la fecha de fin");
      return;
    }

    generateReport.mutate({
      reportType,
      startDate,
      endDate,
    });
  };

  // Formatear tamaño de archivo
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  // Inicializar fechas al cargar
  useMemo(() => {
    if (!startDate && !endDate) {
      const dates = calculateDates("monthly");
      setStartDate(dates.start);
      setEndDate(dates.end);
    }
  }, []);

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileBarChart className="h-8 w-8 text-primary" />
          Reportes Ejecutivos
        </h1>
        <p className="text-muted-foreground mt-2">
          Genera reportes consolidados en PDF con KPIs y métricas del sistema NOM-035
        </p>
      </div>

      {/* Generador de Reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Generar Nuevo Reporte</CardTitle>
          <CardDescription>Selecciona el periodo y genera un reporte ejecutivo en PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tipo de Reporte */}
            <div className="space-y-2">
              <Label>Tipo de Reporte</Label>
              <Select
                value={reportType}
                onValueChange={(value) => handleReportTypeChange(value as any)}
              >
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

            {/* Fecha Inicio */}
            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={reportType !== "custom"}
              />
            </div>

            {/* Fecha Fin */}
            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={reportType !== "custom"}
              />
            </div>

            {/* Botón Generar */}
            <div className="space-y-2">
              <Label className="invisible">Generar</Label>
              <Button
                onClick={handleGenerateReport}
                disabled={generateReport.isPending}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                {generateReport.isPending ? "Generando..." : "Generar Reporte"}
              </Button>
            </div>
          </div>

          {/* Información del periodo */}
          {startDate && endDate && (
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Calendar className="h-4 w-4 inline mr-2" />
                Periodo seleccionado: <strong>{new Date(startDate).toLocaleDateString("es-MX")}</strong> a{" "}
                <strong>{new Date(endDate).toLocaleDateString("es-MX")}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historial de Reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Reportes Generados</CardTitle>
          <CardDescription>Últimos 20 reportes ejecutivos generados</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay reportes generados aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((report: any) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{report.periodLabel}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(report.startDate).toLocaleDateString("es-MX")} -{" "}
                        {new Date(report.endDate).toLocaleDateString("es-MX")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(report.generatedAt).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {report.generatorName || "Usuario"}
                      </span>
                      <span>{formatFileSize(report.fileSize)}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(report.fileUrl, "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
