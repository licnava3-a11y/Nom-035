import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  Target, 
  Award, 
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function CareerPlanningDashboard() {
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  
  const { data: activePaths } = trpc.careerPlanning.getActivePaths.useQuery();
  const { data: employeePlan } = trpc.careerPlanning.getEmployeePlan.useQuery(
    { employeeId: selectedEmployee! },
    { enabled: !!selectedEmployee }
  );
  const { data: suggestions } = trpc.careerPlanning.suggestPath.useQuery(
    { employeeId: selectedEmployee! },
    { enabled: !!selectedEmployee }
  );
  const { data: vacancyProjections } = trpc.careerPlanning.getVacancyProjections.useQuery();
  
  const updateMilestoneMutation = trpc.careerPlanning.updateMilestone.useMutation();
  
  const handleUpdateMilestone = async (milestoneId: string, status: "pending" | "in_progress" | "completed") => {
    if (!employeePlan) return;
    
    await updateMilestoneMutation.mutateAsync({
      planId: employeePlan.id,
      milestoneId,
      status,
    });
  };
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Planes de Carrera</h1>
          <p className="text-muted-foreground">
            Desarrollo profesional y rutas de crecimiento personalizadas
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="paths" className="space-y-4">
        <TabsList>
          <TabsTrigger value="paths">Rutas Disponibles</TabsTrigger>
          <TabsTrigger value="suggestions">Sugerencias Personalizadas</TabsTrigger>
          <TabsTrigger value="myplan">Mi Plan de Carrera</TabsTrigger>
          <TabsTrigger value="vacancies">Proyección de Vacantes</TabsTrigger>
        </TabsList>
        
        {/* Tab: Rutas Disponibles */}
        <TabsContent value="paths" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {activePaths?.map((path: any) => (
              <Card key={path.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {path.pathName}
                  </CardTitle>
                  <CardDescription>{path.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Niveles de Posición:</div>
                    <div className="space-y-1">
                      {path.positions.map((pos: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span>Nivel {pos.level}: {pos.positionName}</span>
                          <Badge variant="outline">{pos.estimatedTimeMonths} meses</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {path.minimumEducation && (
                    <div className="text-sm">
                      <span className="font-medium">Educación mínima:</span> {path.minimumEducation}
                    </div>
                  )}
                  
                  {path.minimumExperience && (
                    <div className="text-sm">
                      <span className="font-medium">Experiencia mínima:</span> {Math.floor(path.minimumExperience / 12)} años
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Tab: Sugerencias Personalizadas */}
        <TabsContent value="suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Rutas Recomendadas para Ti</CardTitle>
              <CardDescription>
                Basadas en tu perfil, competencias y experiencia actual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {suggestions?.map((suggestion, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{suggestion.pathName}</h3>
                    <Badge variant={suggestion.matchScore >= 70 ? "default" : "secondary"}>
                      {suggestion.matchScore}% compatibilidad
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>Duración estimada: {Math.floor(suggestion.estimatedDuration / 12)} años</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>{suggestion.positions.length} niveles</span>
                    </div>
                  </div>
                  
                  <Progress value={suggestion.matchScore} className="h-2" />
                  
                  <Button size="sm" className="w-full">
                    Crear Plan de Carrera
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Tab: Mi Plan de Carrera */}
        <TabsContent value="myplan" className="space-y-4">
          {employeePlan ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    {employeePlan.path?.pathName}
                  </CardTitle>
                  <CardDescription>
                    Nivel actual: {employeePlan.currentLevel} → Nivel objetivo: {employeePlan.targetLevel}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Progreso General */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Progreso General</span>
                      <span className="text-muted-foreground">
                        {Math.round((employeePlan.currentLevel / employeePlan.targetLevel) * 100)}%
                      </span>
                    </div>
                    <Progress 
                      value={(employeePlan.currentLevel / employeePlan.targetLevel) * 100} 
                      className="h-3"
                    />
                  </div>
                  
                  {/* Hitos */}
                  <div className="space-y-3">
                    <h3 className="font-semibold">Hitos de Desarrollo</h3>
                    <div className="space-y-2">
                      {employeePlan.milestones?.map((milestone: any) => (
                        <div key={milestone.id} className="flex items-start gap-3 p-3 border rounded-lg">
                          <div className="mt-0.5">
                            {milestone.status === "completed" && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                            {milestone.status === "in_progress" && (
                              <Clock className="h-5 w-5 text-blue-600" />
                            )}
                            {milestone.status === "pending" && (
                              <AlertCircle className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="font-medium">{milestone.title}</div>
                            <div className="text-sm text-muted-foreground">{milestone.description}</div>
                            <div className="text-xs text-muted-foreground">
                              Fecha objetivo: {new Date(milestone.targetDate).toLocaleDateString()}
                            </div>
                          </div>
                          <Badge variant={
                            milestone.status === "completed" ? "default" :
                            milestone.status === "in_progress" ? "secondary" : "outline"
                          }>
                            {milestone.status === "completed" ? "Completado" :
                             milestone.status === "in_progress" ? "En progreso" : "Pendiente"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Brechas de Competencias */}
                  {employeePlan.competencyGaps && employeePlan.competencyGaps.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">Brechas de Competencias</h3>
                      <div className="space-y-2">
                        {employeePlan.competencyGaps.map((gap: any, idx: number) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{gap.competencyName}</span>
                              <Badge variant="outline">
                                Brecha: {gap.gap} niveles
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Actual: {gap.currentLevel}</span>
                              <span>→</span>
                              <span>Requerido: {gap.requiredLevel}</span>
                            </div>
                            {gap.recommendedCourses.length > 0 && (
                              <div className="text-sm">
                                <span className="font-medium">Cursos recomendados:</span>
                                <ul className="list-disc list-inside ml-2 mt-1">
                                  {gap.recommendedCourses.map((course: any, cidx: number) => (
                                    <li key={cidx}>{course.courseName} ({course.duration}h)</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Award className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">No tienes un plan de carrera activo</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Explora las rutas disponibles y crea tu plan personalizado
                </p>
                <Button>Explorar Rutas</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Tab: Proyección de Vacantes */}
        <TabsContent value="vacancies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proyección de Vacantes Futuras</CardTitle>
              <CardDescription>
                Basada en patrones históricos de rotación (próximos 6 meses)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={vacancyProjections || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="position" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="estimatedVacancies" fill="#3b82f6" name="Vacantes Estimadas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-6 space-y-2">
                <h3 className="font-semibold">Detalles de Proyecciones</h3>
                <div className="space-y-2">
                  {vacancyProjections?.map((proj, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{proj.position}</div>
                        <div className="text-sm text-muted-foreground">
                          Fecha estimada: {new Date(proj.estimatedOpeningDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{proj.estimatedVacancies} vacantes</div>
                        <Badge variant="outline">{Math.round(proj.probability)}% probabilidad</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
