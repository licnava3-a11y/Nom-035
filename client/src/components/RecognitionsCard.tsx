import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Award, ArrowRight, Trophy } from "lucide-react";
import { Link } from "wouter";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

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
    labels: report.byCategory.map((c) => c.categoryName),
    datasets: [
      {
        data: report.byCategory.map((c) => c.count),
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
          <Button variant="outline" className="w-full gap-2" disabled>
            Exportar Reporte Mensual (PDF)
            <ArrowRight className="h-4 w-4" />
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Próximamente: Exportación automática a PDF
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
