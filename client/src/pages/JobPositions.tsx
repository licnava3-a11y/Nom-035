import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, AlertTriangle, TrendingUp, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { JobAnalysisDialog } from "@/components/JobAnalysisDialog";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function JobPositions() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Obtener puestos reales de la base de datos
  const { data: jobPositions = [], refetch } = trpc.jobPositions.list.useQuery();

  // Datos de ejemplo para demostración (se mostrarán si no hay datos reales)
  const examplePositions = [
    {
      id: 1,
      title: "Gerente de Recursos Humanos",
      department: "Recursos Humanos",
      employees: 3,
      riskLevel: "bajo",
      lastAnalysis: "2026-01-15",
      factors: {
        workload: 2,
        control: 3,
        leadership: 4,
        relationships: 4,
        workEnvironment: 3,
      },
    },
    {
      id: 2,
      title: "Operador de Producción",
      department: "Producción",
      employees: 45,
      riskLevel: "alto",
      lastAnalysis: "2026-01-20",
      factors: {
        workload: 4,
        control: 2,
        leadership: 3,
        relationships: 3,
        workEnvironment: 2,
      },
    },
    {
      id: 3,
      title: "Analista de Sistemas",
      department: "Tecnología",
      employees: 8,
      riskLevel: "medio",
      lastAnalysis: "2026-01-25",
      factors: {
        workload: 3,
        control: 3,
        leadership: 3,
        relationships: 4,
        workEnvironment: 3,
      },
    },
  ];

  // Usar datos reales si existen, si no usar ejemplos
  const displayPositions = jobPositions.length > 0 ? jobPositions.map(pos => ({
    id: pos.id,
    title: pos.positionName,
    department: pos.department || 'Sin departamento',
    employees: (pos as any).employeeCount ?? 0,
    riskLevel: pos.riskLevel === 'low' ? 'bajo' : pos.riskLevel === 'medium' ? 'medio' : pos.riskLevel === 'high' ? 'alto' : 'muy_alto',
    lastAnalysis: new Date(pos.createdAt).toISOString().split('T')[0],
    factors: {
      workload: 2,
      control: 3,
      leadership: 3,
      relationships: 3,
      workEnvironment: 3,
    },
  })) : examplePositions;

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "bajo":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Riesgo Bajo</Badge>;
      case "medio":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Riesgo Medio</Badge>;
      case "alto":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Riesgo Alto</Badge>;
      default:
        return null;
    }
  };

  const calculateOverallRisk = (factors: any) => {
    const avg = (factors.workload + factors.control + factors.leadership + factors.relationships + factors.workEnvironment) / 5;
    return Math.round(avg * 10) / 10;
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Gestión de Talento",
                href: "/"
        },
        {
                label: "Puestos"
        }
]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Puestos</h1>
          <p className="text-muted-foreground mt-2">
            Evaluación de factores de riesgo psicosocial por puesto de trabajo
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "instructor") && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Análisis
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puestos Analizados</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayPositions.length}</div>
            <p className="text-xs text-muted-foreground">Total de puestos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {displayPositions.filter((p: any) => p.riskLevel === "alto").length}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayPositions.reduce((acc: any, p: any) => acc + p.employees, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total evaluados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Promedio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.8</div>
            <p className="text-xs text-muted-foreground">Escala de 1 a 5</p>
          </CardContent>
        </Card>
      </div>

      {/* Job Positions List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Puestos de Trabajo</h2>
        {displayPositions.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No hay puestos registrados. Crea el primer análisis de puesto.
              </p>
            </CardContent>
          </Card>
        )}
        {displayPositions.map((position: any) => (
          <Card key={position.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{position.title}</CardTitle>
                      {getRiskBadge(position.riskLevel)}
                    </div>
                    <CardDescription>{position.department}</CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>{position.employees} empleados</span>
                      <span>•</span>
                      <span>Último análisis: {new Date(position.lastAnalysis).toLocaleDateString("es-MX")}</span>
                      <span>•</span>
                      <span>Índice: {calculateOverallRisk(position.factors)}/5</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Factors */}
                <div className="grid grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Carga de Trabajo</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${position.factors.workload >= 4 ? "bg-red-500" : position.factors.workload >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(position.factors.workload / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{position.factors.workload}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Control</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${position.factors.control >= 4 ? "bg-red-500" : position.factors.control >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(position.factors.control / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{position.factors.control}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Liderazgo</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${position.factors.leadership >= 4 ? "bg-red-500" : position.factors.leadership >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(position.factors.leadership / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{position.factors.leadership}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Relaciones</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${position.factors.relationships >= 4 ? "bg-red-500" : position.factors.relationships >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(position.factors.relationships / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{position.factors.relationships}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Ambiente</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${position.factors.workEnvironment >= 4 ? "bg-red-500" : position.factors.workEnvironment >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(position.factors.workEnvironment / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{position.factors.workEnvironment}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">
                    Ver Detalles
                  </Button>
                  <Button variant="outline" size="sm">
                    Actualizar Análisis
                  </Button>
                  <Button variant="outline" size="sm">
                    Descargar Reporte
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Factores de Riesgo Psicosocial</CardTitle>
          <CardDescription>Categorías evaluadas según la NOM-035-STPS-2018</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Carga de Trabajo</h4>
              <p className="text-sm text-muted-foreground">
                Evaluación de las exigencias que el trabajo impone al trabajador y que exceden su capacidad
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Falta de Control</h4>
              <p className="text-sm text-muted-foreground">
                Posibilidad del trabajador para influir y tomar decisiones sobre los diversos aspectos que intervienen en su actividad
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Liderazgo Negativo</h4>
              <p className="text-sm text-muted-foreground">
                Tipo de relación que se establece entre el patrón o sus representantes y los trabajadores
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Relaciones Negativas</h4>
              <p className="text-sm text-muted-foreground">
                Interacción que se establece en el contexto laboral y que puede generar conflictos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de creación */}
      <JobAnalysisDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
