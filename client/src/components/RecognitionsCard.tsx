import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Award, ArrowRight, Trophy } from "lucide-react";
import { Link } from "wouter";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function RecognitionsCard() {
  const now = new Date();
  const monthlyReportQuery = trpc.recognitions.getMonthlyReport.useQuery({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });

  if (monthlyReportQuery.isLoading) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">Reconocimientos del Mes</CardTitle>
          </div>
          <CardDescription className="text-green-700">
            Cargando estadísticas...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">Cargando datos...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (monthlyReportQuery.error || !monthlyReportQuery.data) {
    return null;
  }

  const report = monthlyReportQuery.data;

  // Preparar datos para gráfico de categorías
  const categoryData = {
    labels: report.byCategory.map((c: any) => c.categoryName),
    datasets: [
      {
        data: report.byCategory.map((c: any) => c.count),
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)", // green-500
          "rgba(59, 130, 246, 0.8)", // blue-500
          "rgba(239, 68, 68, 0.8)", // red-500
          "rgba(234, 179, 8, 0.8)", // yellow-500
          "rgba(168, 85, 247, 0.8)", // purple-500
          "rgba(236, 72, 153, 0.8)", // pink-500
          "rgba(20, 184, 166, 0.8)", // teal-500
          "rgba(249, 115, 22, 0.8)", // orange-500
          "rgba(14, 165, 233, 0.8)", // sky-500
          "rgba(132, 204, 22, 0.8)", // lime-500
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11,
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(22, 101, 52); // verde
    doc.text("Reporte Mensual de Reconocimientos", 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Periodo: ${report.period.month}/${report.period.year}`, 20, 30);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-MX')}`, 20, 37);
    
    // Estadísticas generales
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52);
    doc.text("Estadísticas Generales", 20, 50);
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Total de reconocimientos: ${report.total}`, 25, 58);
    
    // Agregar gráfico de categorías
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const imgData = canvas.toDataURL('image/png');
      doc.addImage(imgData, 'PNG', 20, 65, 80, 80);
    }
    
    // Tabla de categorías
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52);
    doc.text("Distribución por Categoría", 20, 155);
    
    autoTable(doc, {
      startY: 160,
      head: [['Categoría', 'Cantidad', 'Porcentaje']],
      body: report.byCategory.map(c => [
        c.categoryName,
        c.count.toString(),
        `${((c.count / report.total) * 100).toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [22, 101, 52] },
    });
    
    // Top 10 empleados
    const finalY = (doc as any).lastAutoTable.finalY || 75;
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52);
    doc.text("Top 10 Empleados Más Reconocidos", 20, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Posición', 'Empleado', 'Reconocimientos']],
      body: report.topRecognized.map((emp, index) => [
        `${index + 1}`,
        emp.userName || 'Sin nombre',
        emp.count.toString()
      ]),
      theme: 'striped',
      headStyles: { fillColor: [22, 101, 52] },
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`reporte-reconocimientos-${report.period.year}-${report.period.month}.pdf`);
  };

  return (
    <Card className="border-green-200 bg-green-50/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-600" />
            <CardTitle className="text-green-900">Reconocimientos del Mes</CardTitle>
          </div>
          <Link href="/talent/recognitions">
            <Button variant="outline" size="sm" className="gap-2">
              Ver Todos
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <CardDescription className="text-green-700">
          {report.total} reconocimientos enviados este mes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Gráfico de categorías */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-green-900">Por Categoría</h4>
            {report.byCategory.length > 0 ? (
              <div className="h-[200px]">
                <Doughnut data={categoryData} options={chartOptions} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No hay datos de categorías
              </div>
            )}
          </div>

          {/* Top 10 empleados */}
          <div>
            <h4 className="text-sm font-medium mb-3 text-green-900 flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top 10 Más Reconocidos
            </h4>
            {report.topRecognized.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {report.topRecognized.map((emp, index) => (
                  <div
                    key={emp.userId}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                          index === 0
                            ? "bg-yellow-400 text-yellow-900"
                            : index === 1
                            ? "bg-gray-300 text-gray-700"
                            : index === 2
                            ? "bg-orange-400 text-orange-900"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium">{emp.userName}</span>
                    </div>
                    <span className="text-sm font-bold text-green-700">{emp.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No hay datos de empleados
              </div>
            )}
          </div>
        </div>

        {/* Botón de exportación */}
        <div className="mt-6 pt-4 border-t border-green-200">
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={exportToPDF}
          >
            Exportar Reporte Mensual (PDF)
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
