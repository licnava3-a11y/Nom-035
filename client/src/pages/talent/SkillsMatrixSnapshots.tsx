import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Trash2, Calendar, FileDown } from "lucide-react";
import { Link } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function SkillsMatrixSnapshots() {
  const [snapshot1Id, setSnapshot1Id] = useState<number | undefined>();
  const [snapshot2Id, setSnapshot2Id] = useState<number | undefined>();
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | undefined>();

  // Queries
  const { data: snapshotsData, refetch } = trpc.skillsMatrixSnapshots.getAll.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: trendData } = trpc.skillsMatrixSnapshots.getTrendData.useQuery({
    departmentId: selectedDepartmentId,
  });

  const { data: departmentsData } = trpc.departments.getAll.useQuery({});

  const { data: comparisonData, isLoading: isComparing } = trpc.skillsMatrixSnapshots.compareSnapshots.useQuery(
    {
      snapshot1Id: snapshot1Id!,
      snapshot2Id: snapshot2Id!,
    },
    {
      enabled: !!snapshot1Id && !!snapshot2Id && snapshot1Id !== snapshot2Id,
    }
  );

  // Mutations
  const deleteSnapshotMutation = trpc.skillsMatrixSnapshots.deleteSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Snapshot eliminado", { description: "El snapshot se eliminó correctamente" });
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el snapshot "${name}"?`)) {
      deleteSnapshotMutation.mutate({ id });
    }
  };

  const handleExportPDF = async () => {
    if (!snapshot1Id || !snapshot2Id || !comparisonData) {
      toast.error("Error", { description: "Selecciona dos snapshots para comparar" });
      return;
    }

    try {
      toast.info("Generando PDF", { description: "Por favor espera..." });

      // Import jsPDF dynamically
      const { jsPDF } = await import("jspdf");
      await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text("Reporte de Comparación de Snapshots", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const snapshot1 = snapshots.find(s => s.id === snapshot1Id);
      const snapshot2 = snapshots.find(s => s.id === snapshot2Id);
      doc.text(`${snapshot1?.name} vs ${snapshot2?.name}`, pageWidth / 2, yPos, { align: "center" });
      yPos += 15;

      // KPIs Section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Indicadores Clave de Desempeño (KPIs)", 14, yPos);
      yPos += 10;

      const kpisData = [
        ["Empleados", comparisonData.summaryComparison.totalEmployees.before.toString(), comparisonData.summaryComparison.totalEmployees.after.toString(), comparisonData.summaryComparison.totalEmployees.change.toString(), `${comparisonData.summaryComparison.totalEmployees.percentChange}%`],
        ["Nivel Promedio", comparisonData.summaryComparison.averageCompetencyLevel.before.toFixed(2), comparisonData.summaryComparison.averageCompetencyLevel.after.toFixed(2), comparisonData.summaryComparison.averageCompetencyLevel.change.toFixed(2), `${comparisonData.summaryComparison.averageCompetencyLevel.percentChange}%`],
        ["Brechas Totales", comparisonData.summaryComparison.totalGaps.before.toString(), comparisonData.summaryComparison.totalGaps.after.toString(), comparisonData.summaryComparison.totalGaps.change.toString(), `${comparisonData.summaryComparison.totalGaps.percentChange}%`],
        ["Brechas Críticas", comparisonData.summaryComparison.criticalGaps.before.toString(), comparisonData.summaryComparison.criticalGaps.after.toString(), comparisonData.summaryComparison.criticalGaps.change.toString(), `${comparisonData.summaryComparison.criticalGaps.percentChange}%`],
      ];

      (doc as any).autoTable({
        startY: yPos,
        head: [["Indicador", "Anterior", "Actual", "Cambio", "% Cambio"]],
        body: kpisData,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Top Improvers
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Top 10 Empleados con Mayor Mejora", 14, yPos);
      yPos += 10;

      const improversData = comparisonData.topImprovers.map(emp => [
        emp.employeeName,
        emp.departmentName,
        emp.averageLevel.before.toFixed(2),
        emp.averageLevel.after.toFixed(2),
        emp.averageLevel.change.toFixed(2),
        emp.totalGap.before.toString(),
        emp.totalGap.after.toString(),
        emp.totalGap.change.toString(),
      ]);

      (doc as any).autoTable({
        startY: yPos,
        head: [["Empleado", "Departamento", "Nivel Ant.", "Nivel Act.", "Cambio", "Brecha Ant.", "Brecha Act.", "Cambio Brecha"]],
        body: improversData,
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 8 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Needs Attention
      if (comparisonData.needsAttention.length > 0) {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text("Empleados que Requieren Atención", 14, yPos);
        yPos += 10;

        const needsAttentionData = comparisonData.needsAttention.map(emp => [
          emp.employeeName,
          emp.departmentName,
          emp.averageLevel.before.toFixed(2),
          emp.averageLevel.after.toFixed(2),
          emp.averageLevel.change.toFixed(2),
          emp.totalGap.before.toString(),
          emp.totalGap.after.toString(),
          emp.totalGap.change.toString(),
        ]);

        (doc as any).autoTable({
          startY: yPos,
          head: [["Empleado", "Departamento", "Nivel Ant.", "Nivel Act.", "Cambio", "Brecha Ant.", "Brecha Act.", "Cambio Brecha"]],
          body: needsAttentionData,
          theme: "grid",
          headStyles: { fillColor: [239, 68, 68] },
          styles: { fontSize: 8 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Recommendations
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(14);
      doc.text("Recomendaciones", 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      const recommendations = [];

      if (comparisonData.summaryComparison.averageCompetencyLevel.change > 0) {
        recommendations.push("• El nivel promedio de competencias ha mejorado. Continuar con los programas de capacitación actuales.");
      } else if (comparisonData.summaryComparison.averageCompetencyLevel.change < 0) {
        recommendations.push("• El nivel promedio de competencias ha disminuido. Revisar y ajustar los programas de capacitación.");
      }

      if (comparisonData.summaryComparison.totalGaps.change < 0) {
        recommendations.push("• Las brechas de competencias han disminuido. Excelente progreso en el desarrollo del equipo.");
      } else if (comparisonData.summaryComparison.totalGaps.change > 0) {
        recommendations.push("• Las brechas de competencias han aumentado. Implementar planes de desarrollo personalizados.");
      }

      if (comparisonData.needsAttention.length > 0) {
        recommendations.push(`• ${comparisonData.needsAttention.length} empleados requieren atención inmediata. Priorizar su desarrollo.`);
      }

      if (comparisonData.topImprovers.length > 0) {
        recommendations.push(`• Reconocer y recompensar a los ${comparisonData.topImprovers.length} empleados con mayor mejora.`);
      }

      recommendations.forEach(rec => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(rec, 14, yPos, { maxWidth: pageWidth - 28 });
        yPos += 10;
      });

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generado el ${new Date().toLocaleDateString()} - Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
        doc.text(
          "© 2026 Plataforma NOM-035 STPS 2018. Todos los derechos reservados.",
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 5,
          { align: "center" }
        );
      }

      // Save PDF
      doc.save(`comparacion-snapshots-${snapshot1?.name}-vs-${snapshot2?.name}.pdf`);
      toast.success("PDF generado", { description: "El reporte se descargó correctamente" });
    } catch (error) {
      console.error("Error al generar PDF:", error);
      toast.error("Error", { description: "No se pudo generar el PDF" });
    }
  };

  const snapshots = snapshotsData?.snapshots || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Gestión de Talento", href: "/" },
          { label: "Matriz de Habilidades", href: "/talent/skills-matrix" },
          { label: "Snapshots" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Snapshots de Matriz de Habilidades</h1>
          <p className="text-muted-foreground">
            Compara el progreso de competencias a lo largo del tiempo
          </p>
        </div>
        <Link href="/talent/skills-matrix">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Matriz
          </Button>
        </Link>
      </div>

      {/* Department Filter for Trends */}
      {trendData && trendData.labels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filtrar Gráficos de Tendencia</CardTitle>
            <CardDescription>Selecciona un departamento para ver su evolución temporal</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <label className="text-sm font-medium mb-2 block">Departamento</label>
              <Select
                value={selectedDepartmentId?.toString() || "all"}
                onValueChange={(value) => setSelectedDepartmentId(value === "all" ? undefined : Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departmentsData?.departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trend Charts */}
      {trendData && trendData.labels.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Average Level Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolución del Nivel Promedio{selectedDepartmentId && departmentsData ? ` - ${departmentsData.departments.find(d => d.id === selectedDepartmentId)?.name}` : " - Todos los departamentos"}</CardTitle>
              <CardDescription>Tendencia del nivel de competencias a lo largo del tiempo</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <canvas ref={(canvas) => {
                  if (canvas && trendData) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      // Destroy previous chart if exists
                      const existingChart = Chart.getChart(canvas);
                      if (existingChart) existingChart.destroy();
                      
                      new Chart(ctx, {
                        type: "line",
                        data: {
                          labels: trendData.labels,
                          datasets: [{
                            label: "Nivel Promedio",
                            data: trendData.datasets.averageLevel,
                            borderColor: "rgb(34, 197, 94)",
                            backgroundColor: "rgba(34, 197, 94, 0.1)",
                            tension: 0.3,
                            fill: true,
                          }],
                        },
                        options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `Nivel: ${context.parsed.y.toFixed(2)}`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 4,
                              ticks: { stepSize: 1 },
                            },
                          },
                        },
                      });
                    }
                  }
                }} />
              </div>
            </CardContent>
          </Card>

          {/* Total Gaps Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolución de Brechas Totales</CardTitle>
              <CardDescription>Tendencia de brechas de competencias identificadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <canvas ref={(canvas) => {
                  if (canvas && trendData) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      const existingChart = Chart.getChart(canvas);
                      if (existingChart) existingChart.destroy();
                      
                      new Chart(ctx, {
                        type: "line",
                        data: {
                          labels: trendData.labels,
                          datasets: [{
                            label: "Brechas Totales",
                            data: trendData.datasets.totalGaps,
                            borderColor: "rgb(239, 68, 68)",
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                            tension: 0.3,
                            fill: true,
                          }],
                        },
                        options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `Brechas: ${context.parsed.y}`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        },
                      });
                    }
                  }
                }} />
              </div>
            </CardContent>
          </Card>

          {/* Critical Gaps Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolución de Brechas Críticas</CardTitle>
              <CardDescription>Tendencia de brechas críticas que requieren atención inmediata</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <canvas ref={(canvas) => {
                  if (canvas && trendData) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      const existingChart = Chart.getChart(canvas);
                      if (existingChart) existingChart.destroy();
                      
                      new Chart(ctx, {
                        type: "line",
                        data: {
                          labels: trendData.labels,
                          datasets: [{
                            label: "Brechas Críticas",
                            data: trendData.datasets.criticalGaps,
                            borderColor: "rgb(220, 38, 38)",
                            backgroundColor: "rgba(220, 38, 38, 0.1)",
                            tension: 0.3,
                            fill: true,
                          }],
                        },
                        options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `Brechas Críticas: ${context.parsed.y}`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                            },
                          },
                        },
                      });
                    }
                  }
                }} />
              </div>
            </CardContent>
          </Card>

          {/* Total Employees Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolución de Total de Empleados</CardTitle>
              <CardDescription>Tendencia del número de empleados evaluados</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <canvas ref={(canvas) => {
                  if (canvas && trendData) {
                    const ctx = canvas.getContext("2d");
                    if (ctx) {
                      const existingChart = Chart.getChart(canvas);
                      if (existingChart) existingChart.destroy();
                      
                      new Chart(ctx, {
                        type: "line",
                        data: {
                          labels: trendData.labels,
                          datasets: [{
                            label: "Total Empleados",
                            data: trendData.datasets.totalEmployees,
                            borderColor: "rgb(59, 130, 246)",
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            tension: 0.3,
                            fill: true,
                          }],
                        },
                        options: {
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => `Empleados: ${context.parsed.y}`,
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: { stepSize: 1 },
                            },
                          },
                        },
                      });
                    }
                  }
                }} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Comparison Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Comparar Snapshots</CardTitle>
          <CardDescription>
            Selecciona dos snapshots para ver la evolución de competencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Snapshot Anterior</label>
              <Select
                value={snapshot1Id?.toString()}
                onValueChange={(value) => setSnapshot1Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona snapshot..." />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} - {new Date(s.snapshotDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Snapshot Actual</label>
              <Select
                value={snapshot2Id?.toString()}
                onValueChange={(value) => setSnapshot2Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona snapshot..." />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} - {new Date(s.snapshotDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleExportPDF}
              variant="default"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Exportar Comparación a PDF
            </Button>
          </div>
          {/* Summary Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.totalEmployees.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.totalEmployees.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.totalEmployees.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.totalEmployees.change > 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.totalEmployees.change < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.totalEmployees.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalEmployees.change} (
                    {comparisonData.summaryComparison.totalEmployees.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalEmployees.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nivel Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.averageCompetencyLevel.after.toFixed(2)}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.averageCompetencyLevel.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.averageCompetencyLevel.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.averageCompetencyLevel.change > 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.averageCompetencyLevel.change < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.averageCompetencyLevel.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.averageCompetencyLevel.change} (
                    {comparisonData.summaryComparison.averageCompetencyLevel.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.averageCompetencyLevel.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brechas Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.totalGaps.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.totalGaps.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.totalGaps.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.totalGaps.change < 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.totalGaps.change > 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.totalGaps.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalGaps.change} (
                    {comparisonData.summaryComparison.totalGaps.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalGaps.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brechas Críticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.criticalGaps.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.criticalGaps.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.criticalGaps.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.criticalGaps.change < 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.criticalGaps.change > 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.criticalGaps.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.criticalGaps.change} (
                    {comparisonData.summaryComparison.criticalGaps.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.criticalGaps.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Improvers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 10 Empleados con Mayor Mejora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Nivel Anterior</TableHead>
                    <TableHead className="text-right">Nivel Actual</TableHead>
                    <TableHead className="text-right">Cambio</TableHead>
                    <TableHead className="text-right">Brecha Anterior</TableHead>
                    <TableHead className="text-right">Brecha Actual</TableHead>
                    <TableHead className="text-right">Cambio Brecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.topImprovers.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      <TableCell>{emp.departmentName}</TableCell>
                      <TableCell className="text-right">{emp.averageLevel.before.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{emp.averageLevel.after.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={emp.averageLevel.change > 0 ? "default" : "secondary"} className="bg-green-100 text-green-700">
                          +{emp.averageLevel.change.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{emp.totalGap.before}</TableCell>
                      <TableCell className="text-right">{emp.totalGap.after}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={emp.totalGap.change < 0 ? "default" : "secondary"} className={emp.totalGap.change < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {emp.totalGap.change}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Needs Attention */}
          {comparisonData.needsAttention.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Empleados que Requieren Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Nivel Anterior</TableHead>
                      <TableHead className="text-right">Nivel Actual</TableHead>
                      <TableHead className="text-right">Cambio</TableHead>
                      <TableHead className="text-right">Brecha Anterior</TableHead>
                      <TableHead className="text-right">Brecha Actual</TableHead>
                      <TableHead className="text-right">Cambio Brecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.needsAttention.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                        <TableCell>{emp.departmentName}</TableCell>
                        <TableCell className="text-right">{emp.averageLevel.before.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{emp.averageLevel.after.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={emp.averageLevel.change < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                            {emp.averageLevel.change.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{emp.totalGap.before}</TableCell>
                        <TableCell className="text-right">{emp.totalGap.after}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={emp.totalGap.change > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                            {emp.totalGap.change > 0 ? "+" : ""}{emp.totalGap.change}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* All Snapshots List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Todos los Snapshots
          </CardTitle>
          <CardDescription>
            Total: {snapshots.length} snapshots guardados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleados</TableHead>
                <TableHead>Nivel Promedio</TableHead>
                <TableHead>Brechas Totales</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const data = snapshot.data as any;
                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">{snapshot.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {snapshot.description || "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(snapshot.snapshotDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{data.summary.totalEmployees}</TableCell>
                    <TableCell>{data.summary.averageCompetencyLevel.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {data.summary.totalGaps} ({data.summary.criticalGaps} críticas)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(snapshot.id, snapshot.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
