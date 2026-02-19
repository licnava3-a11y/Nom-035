import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Users, TrendingUp, Award, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function NineBoxMatrix() {
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [selectedEmployee, setSelectedEmployee] = useState<number | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Queries
  const { data: matrixData, isLoading: isLoadingMatrix, refetch: refetchMatrix } = trpc.nineBox.getMatrix.useQuery({
    departamento: selectedDepartment,
    includeLatestOnly: true,
  });

  const { data: distributionData, isLoading: isLoadingDistribution } = trpc.nineBox.getDistribution.useQuery({
    departamento: selectedDepartment,
  });

  const { data: employeeHistory } = trpc.nineBox.getByEmployee.useQuery(
    { employeeId: selectedEmployee! },
    { enabled: !!selectedEmployee }
  );

  // Mutations
  const createMutation = trpc.nineBox.create.useMutation({
    onSuccess: () => {
      toast({ title: "Evaluación creada exitosamente" });
      setIsCreateDialogOpen(false);
      refetchMatrix();
    },
    onError: (error) => {
      toast({ title: "Error al crear evaluación", description: error.message, variant: "destructive" });
    },
  });

  // Organizar evaluaciones en matriz 3x3
  const getQuadrantEmployees = (quadrant: number) => {
    return matrixData?.evaluations.filter(e => e.quadrant === quadrant) || [];
  };

  // Colores por cuadrante
  const getQuadrantColor = (quadrant: number): string => {
    const colors: Record<number, string> = {
      1: "bg-red-100 border-red-300 text-red-900",      // Bajo-Bajo
      2: "bg-orange-100 border-orange-300 text-orange-900", // Bajo-Medio
      3: "bg-yellow-100 border-yellow-300 text-yellow-900", // Bajo-Alto
      4: "bg-orange-50 border-orange-200 text-orange-800",  // Medio-Bajo
      5: "bg-blue-100 border-blue-300 text-blue-900",       // Medio-Medio (Core)
      6: "bg-green-100 border-green-300 text-green-900",    // Medio-Alto
      7: "bg-yellow-50 border-yellow-200 text-yellow-800",  // Alto-Bajo
      8: "bg-green-200 border-green-400 text-green-900",    // Alto-Medio
      9: "bg-emerald-200 border-emerald-400 text-emerald-900", // Alto-Alto (High Potential)
    };
    return colors[quadrant] || "bg-gray-100";
  };

  // Renderizar cuadrante de la matriz
  const renderQuadrant = (quadrant: number, row: number, col: number) => {
    const employees = getQuadrantEmployees(quadrant);
    const quadrantLabel = employees[0]?.quadrantLabel || "";

    return (
      <div
        key={quadrant}
        className={`min-h-[180px] p-4 border-2 rounded-lg ${getQuadrantColor(quadrant)} transition-all hover:shadow-md`}
      >
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-sm">{quadrantLabel}</h3>
          <Badge variant="secondary" className="text-xs">{employees.length}</Badge>
        </div>
        <div className="space-y-1 max-h-[120px] overflow-y-auto">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="text-xs p-2 bg-white/60 rounded cursor-pointer hover:bg-white/90 transition-colors"
              onClick={() => setSelectedEmployee(emp.employeeId)}
            >
              <div className="font-medium">{emp.employeeName}</div>
              <div className="text-gray-600">{emp.employeePuesto}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoadingMatrix || isLoadingDistribution) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando Matriz Nine Box...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matriz Nine Box</h1>
          <p className="text-muted-foreground">Evaluación de Talento: Desempeño vs Potencial</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Award className="mr-2 h-4 w-4" />
              Nueva Evaluación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Evaluación Nine Box</DialogTitle>
              <DialogDescription>
                Evalúa el desempeño y potencial del empleado en escala 1-3
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createMutation.mutate({
                  employeeId: Number(formData.get("employeeId")),
                  performanceScore: Number(formData.get("performanceScore")),
                  potentialScore: Number(formData.get("potentialScore")),
                  evaluationDate: formData.get("evaluationDate") as string,
                  notes: formData.get("notes") as string || undefined,
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">ID del Empleado</Label>
                  <Input id="employeeId" name="employeeId" type="number" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="performanceScore">Desempeño (1-3)</Label>
                    <Select name="performanceScore" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Bajo</SelectItem>
                        <SelectItem value="2">2 - Medio</SelectItem>
                        <SelectItem value="3">3 - Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="potentialScore">Potencial (1-3)</Label>
                    <Select name="potentialScore" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Bajo</SelectItem>
                        <SelectItem value="2">2 - Medio</SelectItem>
                        <SelectItem value="3">3 - Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evaluationDate">Fecha de Evaluación</Label>
                  <Input id="evaluationDate" name="evaluationDate" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea id="notes" name="notes" rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Evaluación"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{matrixData?.totalEmployees || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Potential</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {distributionData?.distribution.find(d => d.quadrant === 9)?.count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Core Performers</CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {distributionData?.distribution.find(d => d.quadrant === 5)?.count || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requieren Atención</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(distributionData?.distribution.find(d => d.quadrant === 1)?.count || 0) +
                (distributionData?.distribution.find(d => d.quadrant === 2)?.count || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Departamento</Label>
              <Select value={selectedDepartment} onValueChange={(value) => setSelectedDepartment(value === "all" ? undefined : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                  <SelectItem value="Operaciones">Operaciones</SelectItem>
                  <SelectItem value="Ventas">Ventas</SelectItem>
                  <SelectItem value="Finanzas">Finanzas</SelectItem>
                  <SelectItem value="TI">TI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matriz 3x3 */}
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Talento 3x3</CardTitle>
          <CardDescription>
            Eje X: Desempeño (Bajo → Alto) | Eje Y: Potencial (Bajo → Alto)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Fila 3: Alto Potencial */}
            <div className="grid grid-cols-3 gap-2">
              {renderQuadrant(7, 3, 1)}
              {renderQuadrant(8, 3, 2)}
              {renderQuadrant(9, 3, 3)}
            </div>
            {/* Fila 2: Medio Potencial */}
            <div className="grid grid-cols-3 gap-2">
              {renderQuadrant(4, 2, 1)}
              {renderQuadrant(5, 2, 2)}
              {renderQuadrant(6, 2, 3)}
            </div>
            {/* Fila 1: Bajo Potencial */}
            <div className="grid grid-cols-3 gap-2">
              {renderQuadrant(1, 1, 1)}
              {renderQuadrant(2, 1, 2)}
              {renderQuadrant(3, 1, 3)}
            </div>
          </div>

          {/* Etiquetas de ejes */}
          <div className="mt-4 flex justify-between text-sm text-muted-foreground">
            <span>← Bajo Desempeño</span>
            <span>Alto Desempeño →</span>
          </div>
          <div className="mt-2 text-center text-sm text-muted-foreground">
            ↑ Alto Potencial | Bajo Potencial ↓
          </div>
        </CardContent>
      </Card>

      {/* Historial del Empleado Seleccionado */}
      {selectedEmployee && employeeHistory && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Evaluaciones</CardTitle>
            <CardDescription>
              Empleado ID: {selectedEmployee} ({employeeHistory.totalEvaluations} evaluaciones)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {employeeHistory.evaluations.map((evaluation) => (
                <div key={evaluation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{evaluation.quadrantLabel}</div>
                    <div className="text-sm text-muted-foreground">
                      Desempeño: {evaluation.performanceScore} | Potencial: {evaluation.potentialScore}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Evaluado por: {evaluation.evaluatorName} | Fecha: {evaluation.evaluationDate}
                    </div>
                  </div>
                  <Badge className={getQuadrantColor(evaluation.quadrant)}>
                    Q{evaluation.quadrant}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
