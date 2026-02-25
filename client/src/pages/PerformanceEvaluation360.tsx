import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Loader2, Users, TrendingUp, Award, Target } from "lucide-react";
import { BarChart } from "../components/BarChart";
import { toast } from "sonner";

export default function PerformanceEvaluation360() {
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedComparisonCompetencyId, setSelectedComparisonCompetencyId] = useState<number | null>(null);

  // Queries
  const { data: cycles, isLoading: cyclesLoading } = trpc.performanceEvaluation360.getCycles.useQuery();
  const { data: nineBoxMatrix, isLoading: matrixLoading } = trpc.performanceEvaluation360.getNineBoxMatrix.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId }
  );
  const { data: leadershipPipeline, isLoading: pipelineLoading } = trpc.performanceEvaluation360.getLeadershipPipeline.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.performanceEvaluation360.getEvaluationStats.useQuery(
    { cycleId: selectedCycleId! },
    { enabled: !!selectedCycleId }
  );
  const { data: departmentComparison, isLoading: comparisonLoading } = trpc.performanceEvaluation360.getDepartmentCompetencyComparison.useQuery(
    { cycleId: selectedCycleId!, competencyId: selectedComparisonCompetencyId! },
    { enabled: !!selectedCycleId && !!selectedComparisonCompetencyId }
  );

  // Mutations
  const createCycleMutation = trpc.performanceEvaluation360.createCycle.useMutation({
    onSuccess: () => {
      toast.success("Ciclo de evaluación 360° creado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const consolidateResultsMutation = trpc.performanceEvaluation360.consolidateResults.useMutation({
    onSuccess: () => {
      toast.success("Resultados consolidados exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Nine Box Matrix Visualization
  const renderNineBoxMatrix = () => {
    if (!nineBoxMatrix) return null;

    const boxes = [
      { x: 0, y: 2, label: "Enigma", color: "bg-yellow-100 border-yellow-300" },
      { x: 1, y: 2, label: "Estrella Emergente", color: "bg-blue-100 border-blue-300" },
      { x: 2, y: 2, label: "Estrella", color: "bg-green-100 border-green-300" },
      { x: 0, y: 1, label: "Bajo Rendimiento", color: "bg-red-100 border-red-300" },
      { x: 1, y: 1, label: "Contribuidor Clave", color: "bg-yellow-100 border-yellow-300" },
      { x: 2, y: 1, label: "Alto Rendimiento", color: "bg-green-100 border-green-300" },
      { x: 0, y: 0, label: "Riesgo", color: "bg-red-200 border-red-400" },
      { x: 1, y: 0, label: "Sólido", color: "bg-gray-100 border-gray-300" },
      { x: 2, y: 0, label: "Profesional", color: "bg-blue-100 border-blue-300" },
    ];

    return (
      <div className="grid grid-cols-3 gap-2 w-full max-w-3xl mx-auto">
        {boxes.map((box) => {
          const employeesInBox = nineBoxMatrix.matrix.filter(
            (e: any) => Math.floor(e.potential / 34) === box.x && Math.floor(e.performance / 34) === (2 - box.y)
          );

          return (
            <Card key={`${box.x}-${box.y}`} className={`${box.color} border-2 min-h-[120px]`}>
              <CardHeader className="p-3">
                <CardTitle className="text-sm font-semibold">{box.label}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-xs space-y-1">
                  {employeesInBox.length > 0 ? (
                    employeesInBox.map((emp: any) => (
                      <div key={emp.employeeId} className="flex items-center justify-between">
                        <span className="truncate">{emp.employeeName}</span>
                        <Badge variant="outline" className="text-xs">
                          {emp.performance}/{emp.potential}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400">Sin empleados</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Leadership Pipeline Visualization
  const renderLeadershipPipeline = () => {
    if (!leadershipPipeline) return null;

    const levels = [
      { level: 6, title: "CEO / Director General", color: "bg-purple-500" },
      { level: 5, title: "VP / Director de Área", color: "bg-indigo-500" },
      { level: 4, title: "Gerente de Función", color: "bg-blue-500" },
      { level: 3, title: "Gerente de Gerentes", color: "bg-cyan-500" },
      { level: 2, title: "Gerente de Otros", color: "bg-teal-500" },
      { level: 1, title: "Gerente de Sí Mismo", color: "bg-green-500" },
    ];

    return (
      <div className="space-y-4">
        {levels.map((lvl) => {
          const employeesAtLevel = leadershipPipeline.pipeline.filter((e: any) => e.leadershipLevel === lvl.level);

          return (
            <Card key={lvl.level} className="border-l-4" style={{ borderLeftColor: lvl.color.replace("bg-", "") }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{lvl.title}</CardTitle>
                  <Badge className={lvl.color}>{employeesAtLevel.length} empleados</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {employeesAtLevel.map((emp: any) => (
                    <div key={emp.employeeId} className="flex items-center space-x-2 text-sm">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="truncate">{emp.employeeName}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  if (cyclesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evaluación de Desempeño 360°</h1>
          <p className="text-muted-foreground">
            Gestión integral de evaluaciones con metodologías Nine Box y Leadership Pipeline
          </p>
        </div>
        <Button
          onClick={() => {
            const name = prompt("Nombre del ciclo de evaluación:");
            if (name) {
              createCycleMutation.mutate({
                name,
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              });
            }
          }}
        >
          Crear Nuevo Ciclo
        </Button>
      </div>

      {/* Selector de Ciclo */}
      <Card>
        <CardHeader>
          <CardTitle>Seleccionar Ciclo de Evaluación</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedCycleId?.toString()}
            onValueChange={(value) => setSelectedCycleId(parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un ciclo" />
            </SelectTrigger>
            <SelectContent>
              {cycles?.map((cycle: any) => (
                <SelectItem key={cycle.id} value={cycle.id.toString()}>
                  {cycle.name} ({new Date(cycle.startDate).toLocaleDateString()} -{" "}
                  {new Date(cycle.endDate).toLocaleDateString()})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      {selectedCycleId && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Evaluaciones Completadas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedEvaluations}</div>
              <p className="text-xs text-muted-foreground">
                {((stats.completedEvaluations / stats.totalEmployees) * 100).toFixed(1)}% completado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Desempeño</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averagePerformance.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Escala 0-100</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio Potencial</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averagePotential.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">Escala 0-100</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Visualización */}
      {selectedCycleId && (
        <Tabs defaultValue="ninebox" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ninebox">Nine Box Matrix</TabsTrigger>
            <TabsTrigger value="pipeline">Leadership Pipeline</TabsTrigger>
            <TabsTrigger value="comparison">Comparativas Departamentales</TabsTrigger>
            <TabsTrigger value="actions">Acciones</TabsTrigger>
          </TabsList>

          <TabsContent value="ninebox" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Matriz Nine Box</CardTitle>
                <CardDescription>
                  Visualización de empleados según desempeño (eje Y) y potencial (eje X)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {matrixLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between text-sm text-muted-foreground">
                      <span>← Bajo Potencial</span>
                      <span>Alto Potencial →</span>
                    </div>
                    {renderNineBoxMatrix()}
                    <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                      <span>↓ Bajo Desempeño</span>
                      <span>Alto Desempeño ↑</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Leadership Pipeline</CardTitle>
                <CardDescription>
                  Distribución de empleados por nivel de liderazgo según metodología Charan-Drotter
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pipelineLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  renderLeadershipPipeline()
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Comparativas Departamentales</CardTitle>
                <CardDescription>
                  Comparación del nivel promedio de competencias entre departamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selector de competencia */}
                <div className="space-y-2">
                  <Label htmlFor="comparison-competency-select">Selecciona una competencia</Label>
                  <Select
                    value={selectedComparisonCompetencyId?.toString() || ""}
                    onValueChange={(value) => setSelectedComparisonCompetencyId(Number(value))}
                  >
                    <SelectTrigger id="comparison-competency-select">
                      <SelectValue placeholder="Selecciona una competencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeCompetencies?.map((comp: any) => (
                        <SelectItem key={comp.competencyId} value={comp.competencyId.toString()}>
                          {comp.competencyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Gráfico de barras */}
                {comparisonLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : departmentComparison && departmentComparison.departments.length > 0 ? (
                  <>
                    <BarChart
                      data={departmentComparison.departments.map((dept: any) => ({
                        departmentName: dept.departmentName,
                        averageLevel: dept.averageLevel,
                        requiredLevel: dept.requiredLevel,
                      }))}
                      competencyName={departmentComparison.competencyName}
                      className="mt-6"
                    />

                    {/* Tabla de detalles */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Detalles por Departamento</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-muted">
                              <th className="border p-2 text-left">Departamento</th>
                              <th className="border p-2 text-center">Nivel Promedio</th>
                              <th className="border p-2 text-center">Nivel Requerido</th>
                              <th className="border p-2 text-center">Brecha</th>
                              <th className="border p-2 text-center">Empleados</th>
                              <th className="border p-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {departmentComparison.departments.map((dept: any, index: number) => (
                              <tr key={index} className="hover:bg-muted/50">
                                <td className="border p-2">{dept.departmentName}</td>
                                <td className="border p-2 text-center font-semibold">{dept.averageLevel.toFixed(1)}</td>
                                <td className="border p-2 text-center">{dept.requiredLevel}</td>
                                <td className="border p-2 text-center">
                                  <span className={dept.gap > 0 ? "text-red-600 font-semibold" : "text-green-600 font-semibold"}>
                                    {dept.gap.toFixed(1)}
                                  </span>
                                </td>
                                <td className="border p-2 text-center">{dept.employeeCount}</td>
                                <td className="border p-2 text-center">
                                  <Badge variant={dept.status === "fortaleza" ? "default" : "destructive"}>
                                    {dept.status === "fortaleza" ? "✅ Fortaleza" : "⚠️ Oportunidad"}
                                  </Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : selectedComparisonCompetencyId ? (
                  <div className="text-center text-muted-foreground py-8">
                    No se encontraron datos para esta competencia
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Selecciona una competencia para visualizar la comparativa departamental
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Acciones del Ciclo</CardTitle>
                <CardDescription>Gestión y consolidación de evaluaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => consolidateResultsMutation.mutate({ cycleId: selectedCycleId })}
                  disabled={consolidateResultsMutation.isPending}
                >
                  {consolidateResultsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Consolidar Resultados
                </Button>
                <p className="text-sm text-muted-foreground">
                  Consolida todas las evaluaciones del ciclo y genera resultados finales para cada empleado.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
