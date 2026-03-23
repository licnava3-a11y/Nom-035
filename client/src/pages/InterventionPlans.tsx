import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  TrendingDown,
  Users,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

export default function InterventionPlans() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);

  // Obtener empleados en riesgo desde RetentionAnalytics
  const { data: atRiskEmployees, isLoading: loadingEmployees } =
    trpc.predictiveAnalytics.identifyAtRiskEmployees.useQuery({
      minScore: 0,
    });

  // Obtener ciclos de evaluación
  const { data: cycles, isLoading: loadingCycles } =
    trpc.performanceEvaluation360.getCycles.useQuery();

  // Mutation para generar plan de intervención
  const generatePlan = trpc.interventions.generateInterventionPlan.useMutation({
    onSuccess: (data) => {
      setGeneratedPlan(data);
      toast.success("Plan de intervención generado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al generar plan: ${error.message}`);
    },
  });

  const handleGeneratePlan = () => {
    if (!selectedEmployee || !selectedCycle) {
      toast.error("Selecciona un empleado y un ciclo de evaluación");
      return;
    }

    generatePlan.mutate({
      employeeId: selectedEmployee,
      cycleId: selectedCycle,
    });
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      crítico: { color: "bg-red-500", icon: AlertTriangle },
      alto: { color: "bg-orange-500", icon: AlertCircle },
      medio: { color: "bg-yellow-500", icon: TrendingDown },
      bajo: { color: "bg-green-500", icon: CheckCircle2 },
    };

    const { color, icon: Icon } = variants[riskLevel] || variants.medio;

    return (
      <Badge className={`${color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {riskLevel.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Planes de Intervención Personalizada</h1>
        <p className="text-muted-foreground mt-2">
          Genera planes de acción automáticos para empleados en riesgo crítico con asignación de mentores, cursos recomendados y seguimiento trimestral
        </p>
      </div>

      {/* Selector de Empleado y Ciclo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Seleccionar Empleado y Ciclo de Evaluación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Empleado en Riesgo</label>
              <Select
                value={selectedEmployee?.toString() || ""}
                onValueChange={(value) => setSelectedEmployee(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {loadingEmployees ? (
                    <SelectItem value="loading" disabled>
                      Cargando...
                    </SelectItem>
                  ) : (
                    atRiskEmployees?.employees.map((emp: any) => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                        {emp.employeeName} - Score: {emp.retentionScore}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ciclo de Evaluación</label>
              <Select
                value={selectedCycle?.toString() || ""}
                onValueChange={(value) => setSelectedCycle(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un ciclo" />
                </SelectTrigger>
                <SelectContent>
                  {loadingCycles ? (
                    <SelectItem value="loading" disabled>
                      Cargando...
                    </SelectItem>
                  ) : (
                    cycles?.map((cycle: any) => (
                      <SelectItem key={cycle.id} value={cycle.id.toString()}>
                        {cycle.name} ({new Date(cycle.startDate).toLocaleDateString('es-MX')} - {new Date(cycle.endDate).toLocaleDateString('es-MX')})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleGeneratePlan}
                disabled={!selectedEmployee || !selectedCycle || generatePlan.isPending}
                className="w-full"
              >
                {generatePlan.isPending ? "Generando..." : "Generar Plan de Intervención"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Generado */}
      {generatedPlan && (
        <div className="space-y-6">
          {/* Resumen del Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Resumen del Plan de Intervención
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Empleado</p>
                  <p className="font-semibold">{generatedPlan.employeeName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Score de Retención</p>
                  <p className="text-2xl font-bold">{generatedPlan.retentionScore}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Nivel de Riesgo</p>
                  {getRiskBadge(generatedPlan.riskLevel)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Competencias Críticas</p>
                  <p className="text-2xl font-bold text-red-500">
                    {generatedPlan.criticalCompetencies}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs con Detalles del Plan */}
          <Tabs defaultValue="courses" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="courses">
                <BookOpen className="w-4 h-4 mr-2" />
                Cursos Recomendados
              </TabsTrigger>
              <TabsTrigger value="mentor">
                <UserCheck className="w-4 h-4 mr-2" />
                Mentor Asignado
              </TabsTrigger>
              <TabsTrigger value="followup">
                <Calendar className="w-4 h-4 mr-2" />
                Seguimiento Trimestral
              </TabsTrigger>
            </TabsList>

            {/* Tab: Cursos Recomendados */}
            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Cursos Recomendados por Competencia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {generatedPlan.courseRecommendations.map((rec: any, idx: number) => (
                      <div key={idx} className="border-l-4 border-blue-500 pl-4 space-y-3">
                        <div>
                          <h3 className="font-semibold text-lg">{rec.competencyName}</h3>
                          <p className="text-sm text-muted-foreground">
                            Brecha detectada: {rec.gap} puntos
                          </p>
                        </div>
                        <div className="space-y-2">
                          {rec.recommendedCourses.map((course: any, courseIdx: number) => (
                            <div
                              key={courseIdx}
                              className="bg-muted/50 p-3 rounded-lg flex items-start justify-between"
                            >
                              <div className="space-y-1">
                                <p className="font-medium">{course.courseName}</p>
                                <p className="text-sm text-muted-foreground">
                                  Duración: {course.duration} | Modalidad: {course.modality}
                                </p>
                              </div>
                              <Badge
                                variant={
                                  course.priority === "Alta"
                                    ? "destructive"
                                    : course.priority === "Media"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {course.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Mentor Asignado */}
            <TabsContent value="mentor">
              <Card>
                <CardHeader>
                  <CardTitle>Mentor Asignado</CardTitle>
                </CardHeader>
                <CardContent>
                  {generatedPlan.assignedMentor ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                        <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                          {generatedPlan.assignedMentor.mentorName.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {generatedPlan.assignedMentor.mentorName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            ID: {generatedPlan.assignedMentor.mentorId}
                          </p>
                          <p className="text-sm font-medium mt-1">
                            Calificación Promedio: {generatedPlan.assignedMentor.averageRating}/5.0
                          </p>
                        </div>
                        <Badge className="bg-green-500 text-white">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Asignado
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold">Responsabilidades del Mentor:</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          <li>Sesiones de mentoría quincenales (primeros 6 meses)</li>
                          <li>Revisión de progreso en competencias críticas</li>
                          <li>Apoyo en aplicación práctica de conocimientos</li>
                          <li>Retroalimentación constructiva y seguimiento continuo</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No se encontró un mentor disponible en el departamento</p>
                      <p className="text-sm mt-1">
                        Considera asignar un mentor de otro departamento o externo
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Seguimiento Trimestral */}
            <TabsContent value="followup">
              <Card>
                <CardHeader>
                  <CardTitle>Plan de Seguimiento Trimestral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {generatedPlan.followUpPlan.map((quarter: any, idx: number) => (
                      <div
                        key={idx}
                        className="border-l-4 border-purple-500 pl-4 space-y-2 pb-4"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-lg">
                            {quarter.quarter} - {quarter.month}
                          </h3>
                          <Badge variant="outline">{quarter.quarter}</Badge>
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Actividades:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {quarter.activities.map((activity: string, actIdx: number) => (
                              <li key={actIdx}>{activity}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm font-medium">Resultado Esperado:</p>
                          <p className="text-sm text-muted-foreground">{quarter.expectedOutcome}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Mensaje cuando no hay plan generado */}
      {!generatedPlan && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No hay plan de intervención generado</p>
              <p className="text-sm mt-2">
                Selecciona un empleado en riesgo y un ciclo de evaluación para generar un plan personalizado
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
