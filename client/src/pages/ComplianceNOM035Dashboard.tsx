/**
 * Dashboard de Cumplimiento NOM-035 por Numeral
 * Muestra porcentaje de cumplimiento por numeral con indicadores de semáforo
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CheckCircle2, Circle, FileCheck, AlertTriangle, CheckSquare } from "lucide-react";
import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ComplianceNOM035Dashboard() {
  const [selectedNumeral, setSelectedNumeral] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Query: cumplimiento por numeral
  const { data: complianceData = [], isLoading } = trpc.complianceNOM035.getComplianceByNumeral.useQuery();

  // Query: estadísticas globales
  const { data: globalStats } = trpc.complianceNOM035.getGlobalStats.useQuery();

  // Mutation: marcar como completado
  const markAsCompleted = trpc.complianceNOM035.markAsCompleted.useMutation({
    onSuccess: () => {
      toast.success("Item marcado como completado");
      utils.complianceNOM035.getComplianceByNumeral.invalidate();
      utils.complianceNOM035.getGlobalStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Mutation: desmarcar
  const markAsIncomplete = trpc.complianceNOM035.markAsIncomplete.useMutation({
    onSuccess: () => {
      toast.success("Item desmarcado");
      utils.complianceNOM035.getComplianceByNumeral.invalidate();
      utils.complianceNOM035.getGlobalStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Determinar color de semáforo
  const getTrafficLightColor = (percentage: number) => {
    if (percentage >= 80) return { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" };
    if (percentage >= 50) return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" };
    return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
  };

  // Datos para gráfico de dona
  const doughnutData = {
    labels: complianceData.map(d => d.numeral),
    datasets: [
      {
        label: "Cumplimiento (%)",
        data: complianceData.map(d => d.percentage),
        backgroundColor: complianceData.map(d => {
          const percentage = d.percentage;
          if (percentage >= 80) return "rgba(34, 197, 94, 0.8)"; // green
          if (percentage >= 50) return "rgba(234, 179, 8, 0.8)"; // yellow
          return "rgba(239, 68, 68, 0.8)"; // red
        }),
        borderColor: complianceData.map(d => {
          const percentage = d.percentage;
          if (percentage >= 80) return "rgba(34, 197, 94, 1)";
          if (percentage >= 50) return "rgba(234, 179, 8, 1)";
          return "rgba(239, 68, 68, 1)";
        }),
        borderWidth: 2,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.label}: ${context.parsed.toFixed(1)}%`;
          },
        },
      },
    },
  };

  // Manejar toggle de item
  const handleToggleItem = (itemId: number, currentStatus: boolean) => {
    if (currentStatus) {
      markAsIncomplete.mutate({ checklistItemId: itemId });
    } else {
      markAsCompleted.mutate({ checklistItemId: itemId });
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileCheck className="h-8 w-8 text-primary" />
          Cumplimiento NOM-035 por Numeral
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitorea el porcentaje de cumplimiento de requisitos por numeral de la NOM-035-STPS-2018
        </p>
      </div>

      {/* Estadísticas Globales */}
      {globalStats && (
        <Card className={`border-2 ${getTrafficLightColor(globalStats.percentage).border}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cumplimiento Global</span>
              <Badge variant={globalStats.level === "high" ? "default" : globalStats.level === "medium" ? "secondary" : "destructive"}>
                {globalStats.percentage.toFixed(1)}%
              </Badge>
            </CardTitle>
            <CardDescription>Estado general de cumplimiento normativo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{globalStats.completed}</p>
                <p className="text-sm text-muted-foreground">Completados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">{globalStats.pending}</p>
                <p className="text-sm text-muted-foreground">Pendientes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{globalStats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid de Numerales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">Cargando numerales...</div>
        ) : complianceData.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay datos de cumplimiento disponibles</p>
          </div>
        ) : (
          complianceData.map((numeral) => {
            const colors = getTrafficLightColor(numeral.percentage);
            return (
              <Dialog key={numeral.numeral}>
                <DialogTrigger asChild>
                  <Card
                    className={`cursor-pointer hover:shadow-lg transition-shadow border-2 ${colors.border}`}
                    onClick={() => setSelectedNumeral(numeral.numeral)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center justify-between">
                        <span>{numeral.numeral}</span>
                        <Badge className={`${colors.bg} ${colors.text}`}>
                          {numeral.percentage.toFixed(0)}%
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Completados:</span>
                          <span className="font-medium">{numeral.completed}/{numeral.total}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              numeral.percentage >= 80 ? "bg-green-600" :
                              numeral.percentage >= 50 ? "bg-yellow-600" :
                              "bg-red-600"
                            }`}
                            style={{ width: `${numeral.percentage}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      <span>Requisitos: {numeral.numeral}</span>
                      <Badge className={`${colors.bg} ${colors.text}`}>
                        {numeral.percentage.toFixed(1)}%
                      </Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {numeral.completed} de {numeral.total} requisitos completados
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    {numeral.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={item.isCompleted}
                          onCheckedChange={() => handleToggleItem(item.id, item.isCompleted)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.itemCode}</Badge>
                            <span className="text-sm font-medium">{item.section} - {item.sectionName}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{item.requirement}</p>
                          <p className="text-xs text-muted-foreground italic">Evidencia: {item.evidence}</p>
                        </div>
                        {item.isCompleted && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })
        )}
      </div>

      {/* Gráfico de Cumplimiento Global */}
      {complianceData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Cumplimiento por Numeral</CardTitle>
            <CardDescription>Porcentaje de cumplimiento de cada numeral de la NOM-035</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
