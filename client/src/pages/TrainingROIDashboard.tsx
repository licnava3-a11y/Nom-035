import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, DollarSign, Award, BarChart3, Download } from "lucide-react";
import { toast } from "sonner";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function TrainingROIDashboard() {
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [periodMonths, setPeriodMonths] = useState(6);
  const [costsDialogOpen, setCostsDialogOpen] = useState(false);
  const [roiDialogOpen, setRoiDialogOpen] = useState(false);
  const [editingTrainingId, setEditingTrainingId] = useState<number | null>(null);

  // Form state para costos
  const [costsForm, setCostsForm] = useState({
    instructorCost: 0,
    materialsCost: 0,
    facilitiesCost: 0,
    laborHoursCost: 0,
    otherCosts: 0,
    notes: "",
  });

  // Queries
  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = trpc.trainingROI.getDashboard.useQuery({ periodMonths });
  const { data: trainingsWithCosts, isLoading: trainingsLoading, refetch: refetchTrainings } = trpc.trainingROI.listWithCosts.useQuery();
  const { data: selectedROI, isLoading: roiLoading } = trpc.trainingROI.calculateROI.useQuery(
    { trainingId: selectedTrainingId!, periodMonths },
    { enabled: !!selectedTrainingId && roiDialogOpen }
  );

  // Mutations
  const upsertCosts = trpc.trainingROI.upsertCosts.useMutation({
    onSuccess: () => {
      toast.success("Costos guardados exitosamente");
      refetchTrainings();
      refetchDashboard();
      setCostsDialogOpen(false);
      resetCostsForm();
    },
    onError: (error) => {
      toast.error(`Error al guardar costos: ${error.message}`);
    },
  });

  const resetCostsForm = () => {
    setCostsForm({
      instructorCost: 0,
      materialsCost: 0,
      facilitiesCost: 0,
      laborHoursCost: 0,
      otherCosts: 0,
      notes: "",
    });
    setEditingTrainingId(null);
  };

  const handleEditCosts = async (trainingId: number) => {
    const training = trainingsWithCosts?.find(t => t.trainingId === trainingId);
    if (training && training.hasCosts) {
      setCostsForm({
        instructorCost: training.instructorCost || 0,
        materialsCost: training.materialsCost || 0,
        facilitiesCost: training.facilitiesCost || 0,
        laborHoursCost: training.laborHoursCost || 0,
        otherCosts: training.otherCosts || 0,
        notes: "",
      });
    } else {
      resetCostsForm();
    }
    setEditingTrainingId(trainingId);
    setCostsDialogOpen(true);
  };

  const handleSaveCosts = () => {
    if (!editingTrainingId) {
      toast.error("Seleccione una capacitación");
      return;
    }

    upsertCosts.mutate({
      trainingId: editingTrainingId,
      ...costsForm,
    });
  };

  const handleViewROI = (trainingId: number) => {
    setSelectedTrainingId(trainingId);
    setRoiDialogOpen(true);
  };

  // Datos para gráfico de ROI por capacitación
  const roiChartData = {
    labels: dashboard?.topROI?.map(t => t.trainingTitle || "Sin título") || [],
    datasets: [
      {
        label: "ROI (%)",
        data: dashboard?.topROI?.map(t => t.roi) || [],
        backgroundColor: "rgba(34, 197, 94, 0.8)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 1,
      },
    ],
  };

  const roiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Top 5 Capacitaciones con Mejor ROI",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  if (dashboardLoading || trainingsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de ROI de Capacitaciones</h1>
          <p className="text-muted-foreground">
            Análisis financiero y retorno de inversión en capacitaciones del comité
          </p>
        </div>
        <Select value={periodMonths.toString()} onValueChange={(v) => setPeriodMonths(parseInt(v))}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Período de análisis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 meses</SelectItem>
            <SelectItem value="6">6 meses</SelectItem>
            <SelectItem value="12">12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de métricas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboard?.totalInvestment?.toLocaleString() || 0} MXN</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.trainingsWithCosts || 0} capacitaciones con costos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Beneficios Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboard?.totalBenefits?.toLocaleString() || 0} MXN</div>
            <p className="text-xs text-muted-foreground">
              Estimación basada en reducción de casos y mejoras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(dashboard?.avgROI || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
              {dashboard?.avgROI?.toFixed(2) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {(dashboard?.avgROI || 0) >= 0 ? "Retorno positivo" : "Retorno negativo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacitaciones Analizadas</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.trainingsWithCosts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Con datos de costos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de ROI */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Capacitaciones con Mejor ROI</CardTitle>
          <CardDescription>
            Capacitaciones ordenadas por retorno de inversión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: "300px" }}>
            <Bar data={roiChartData} options={roiChartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de capacitaciones con costos */}
      <Card>
        <CardHeader>
          <CardTitle>Capacitaciones y Costos</CardTitle>
          <CardDescription>
            Gestión de costos y análisis de ROI por capacitación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Capacitación</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-right p-2">Costo Total</th>
                  <th className="text-right p-2">Instructor</th>
                  <th className="text-right p-2">Materiales</th>
                  <th className="text-right p-2">Instalaciones</th>
                  <th className="text-right p-2">Horas Laborales</th>
                  <th className="text-center p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {trainingsWithCosts?.map((training) => (
                  <tr key={training.trainingId} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{training.title}</td>
                    <td className="p-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        {training.type}
                      </span>
                    </td>
                    <td className="text-right p-2 font-semibold">
                      ${training.totalCost.toLocaleString()} MXN
                    </td>
                    <td className="text-right p-2">${training.instructorCost.toLocaleString()}</td>
                    <td className="text-right p-2">${training.materialsCost.toLocaleString()}</td>
                    <td className="text-right p-2">${training.facilitiesCost.toLocaleString()}</td>
                    <td className="text-right p-2">${training.laborHoursCost.toLocaleString()}</td>
                    <td className="text-center p-2">
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditCosts(training.trainingId)}
                        >
                          {training.hasCosts ? "Editar Costos" : "Agregar Costos"}
                        </Button>
                        {training.hasCosts && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleViewROI(training.trainingId)}
                          >
                            Ver ROI
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para editar costos */}
      <Dialog open={costsDialogOpen} onOpenChange={setCostsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar Costos de Capacitación</DialogTitle>
            <DialogDescription>
              Registre los costos detallados de la capacitación para calcular el ROI
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="instructorCost">Costo de Instructor (MXN)</Label>
                <Input
                  id="instructorCost"
                  type="number"
                  value={costsForm.instructorCost}
                  onChange={(e) => setCostsForm({ ...costsForm, instructorCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="materialsCost">Costo de Materiales (MXN)</Label>
                <Input
                  id="materialsCost"
                  type="number"
                  value={costsForm.materialsCost}
                  onChange={(e) => setCostsForm({ ...costsForm, materialsCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facilitiesCost">Costo de Instalaciones (MXN)</Label>
                <Input
                  id="facilitiesCost"
                  type="number"
                  value={costsForm.facilitiesCost}
                  onChange={(e) => setCostsForm({ ...costsForm, facilitiesCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laborHoursCost">Costo de Horas Laborales (MXN)</Label>
                <Input
                  id="laborHoursCost"
                  type="number"
                  value={costsForm.laborHoursCost}
                  onChange={(e) => setCostsForm({ ...costsForm, laborHoursCost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="otherCosts">Otros Costos (MXN)</Label>
              <Input
                id="otherCosts"
                type="number"
                value={costsForm.otherCosts}
                onChange={(e) => setCostsForm({ ...costsForm, otherCosts: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas (Opcional)</Label>
              <Input
                id="notes"
                value={costsForm.notes}
                onChange={(e) => setCostsForm({ ...costsForm, notes: e.target.value })}
                placeholder="Detalles adicionales sobre los costos..."
              />
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium">Costo Total:</p>
              <p className="text-2xl font-bold text-primary">
                ${(costsForm.instructorCost + costsForm.materialsCost + costsForm.facilitiesCost + costsForm.laborHoursCost + costsForm.otherCosts).toLocaleString()} MXN
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCostsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCosts} disabled={upsertCosts.isPending}>
              {upsertCosts.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Costos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para ver ROI detallado */}
      <Dialog open={roiDialogOpen} onOpenChange={setRoiDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Análisis Detallado de ROI</DialogTitle>
            <DialogDescription>
              Retorno de inversión y beneficios medibles de la capacitación
            </DialogDescription>
          </DialogHeader>
          {roiLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedROI && !("error" in selectedROI) ? (
            <div className="space-y-6 py-4">
              {/* ROI Principal */}
              <Card className="bg-gradient-to-r from-green-50 to-blue-50">
                <CardContent className="pt-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Retorno de Inversión (ROI)</p>
                    <p className={`text-5xl font-bold ${selectedROI.roi >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {selectedROI.roi}%
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedROI.roi >= 0 ? "Inversión rentable" : "Inversión no rentable"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de costos y beneficios */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Costo Total</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      ${selectedROI.totalCost.toLocaleString()} MXN
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Beneficios Totales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      ${selectedROI.totalBenefits.toLocaleString()} MXN
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Desglose de beneficios */}
              <Card>
                <CardHeader>
                  <CardTitle>Desglose de Beneficios</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Reducción de Casos</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedROI.casesReduction} casos menos ({selectedROI.casesReductionPercent}% reducción)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Antes: {selectedROI.casesBefore} casos | Después: {selectedROI.casesAfter} casos
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      ${(selectedROI.casesBenefit || 0).toLocaleString()} MXN
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Mejora en Productividad</p>
                      <p className="text-sm text-muted-foreground">
                        Basado en evaluaciones ({selectedROI.avgRating}/5 estrellas)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedROI.evaluationImprovement}% de mejora estimada
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      ${(selectedROI.productivityBenefit || 0).toLocaleString()} MXN
                    </p>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Certificaciones Obtenidas</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedROI.certificatesObtained} certificados emitidos
                      </p>
                    </div>
                    <p className="text-lg font-bold text-green-600">
                      ${(selectedROI.certificationsBenefit || 0).toLocaleString()} MXN
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Métricas adicionales */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Asignaciones Completadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{selectedROI.completedAssignments}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Calificación Promedio</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{selectedROI.avgRating}/5</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Período de Análisis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{periodMonths} meses</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {selectedROI && "error" in selectedROI ? selectedROI.error : "No se pudo calcular el ROI"}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
