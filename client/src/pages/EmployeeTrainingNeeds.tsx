import React from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ArrowLeft, AlertCircle, TrendingUp, BookOpen, Target } from "lucide-react";
import { toast } from "sonner";

export default function EmployeeTrainingNeeds() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(params.id || "0");

  const { data: employee } = trpc.employees.getById.useQuery({ id: employeeId }) as { data: any };
  const { data: dnc, mutate: generateDNC, isPending: isPending } = trpc.jobProfiles.generateDNC.useMutation();

  // Generate DNC on mount
  React.useEffect(() => {
    if (employeeId && !dnc) {
      generateDNC({ employeeId });
    }
  }, [employeeId, dnc, generateDNC]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generando análisis de necesidades...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!dnc || !employee) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No se pudo generar el análisis</h3>
          <p className="text-muted-foreground mb-4">
            Verifica que el empleado tenga un puesto asignado con competencias definidas
          </p>
          <Button onClick={() => setLocation(`/employees/${employeeId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al perfil
          </Button>
        </Card>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critica":
        return "bg-red-100 text-red-800 border-red-300";
      case "alta":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "media":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "baja":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "critica":
        return "🔴";
      case "alta":
        return "🟠";
      case "media":
        return "🟡";
      case "baja":
        return "🔵";
      default:
        return "⚪";
    }
  };

  const getGapPercentage = (required: string, current: string) => {
    const levels = { basico: 1, intermedio: 2, avanzado: 3, experto: 4 };
    const reqLevel = levels[required as keyof typeof levels] || 1;
    const curLevel = levels[current as keyof typeof levels] || 0;
    const gap = Math.max(0, reqLevel - curLevel);
    return (gap / 4) * 100;
  };

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation(`/employees/${employeeId}`)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al perfil
        </Button>
        <h1 className="text-3xl font-bold">
          Determinación de Necesidades de Capacitación (DNC)
        </h1>
        <p className="text-muted-foreground">
          {employee.firstName} {employee.lastName} - {employee.position || "Sin puesto"}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Brechas</p>
              <p className="text-3xl font-bold">{dnc.needs.length}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Críticas</p>
              <p className="text-3xl font-bold text-red-600">
                {dnc.needs.filter((n: any) => n.priority === "critica").length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Alta Prioridad</p>
              <p className="text-3xl font-bold text-orange-600">
                {dnc.needs.filter((n: any) => n.priority === "alta").length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Prioridad Media/Baja</p>
              <p className="text-3xl font-bold text-green-600">
                {dnc.needs.filter((n: any) => n.priority === "media" || n.priority === "baja").length}
              </p>
            </div>
            <BookOpen className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Needs Analysis */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Análisis de Brechas de Competencias</h2>

        {dnc.needs.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-700 mb-2">
              ¡Excelente desempeño!
            </h3>
            <p className="text-muted-foreground">
              El empleado cumple con todas las competencias requeridas para su puesto
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dnc.needs.map((need: any, index: number) => {
              const gapPercentage = getGapPercentage(
                need.requiredLevel,
                need.currentLevel || "basico"
              );

              return (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-4 ${getPriorityColor(need.priority)}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{getPriorityIcon(need.priority)}</span>
                        <h3 className="text-lg font-semibold">{need.competencyName}</h3>
                        <span className="px-2 py-1 rounded text-xs bg-white/50">
                          {need.competencyType === "tecnica"
                            ? "Técnica"
                            : need.competencyType === "transversal"
                            ? "Transversal"
                            : "Conocimiento"}
                        </span>
                      </div>
                      <p className="text-sm opacity-90">{need.description || "Sin descripción"}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/70 uppercase">
                        {need.priority}
                      </span>
                    </div>
                  </div>

                  {/* Gap Visualization */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        Nivel Actual:{" "}
                        <strong>
                          {need.currentLevel
                            ? need.currentLevel.charAt(0).toUpperCase() +
                              need.currentLevel.slice(1)
                            : "No evaluado"}
                        </strong>
                      </span>
                      <span>
                        Nivel Requerido:{" "}
                        <strong>
                          {need.requiredLevel.charAt(0).toUpperCase() +
                            need.requiredLevel.slice(1)}
                        </strong>
                      </span>
                    </div>
                    <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 transition-all"
                        style={{ width: `${gapPercentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs mt-1 opacity-80">
                      Brecha detectada: {Math.round(gapPercentage)}% de mejora necesaria
                    </p>
                  </div>

                  <div className="text-sm">
                    <strong>Acción recomendada:</strong>{" "}
                    {need.priority === "critica"
                      ? "Capacitación inmediata requerida"
                      : need.priority === "alta"
                      ? "Programar capacitación en el próximo mes"
                      : need.priority === "media"
                      ? "Incluir en plan de capacitación trimestral"
                      : "Considerar para desarrollo a largo plazo"}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Action Plan */}
      {dnc.needs.length > 0 && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Target className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">
                Plan de Acción Recomendado
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Priorizar capacitación en competencias críticas y de alta prioridad</li>
                <li>• Programar cursos específicos para cerrar las brechas identificadas</li>
                <li>• Realizar seguimiento trimestral del progreso</li>
                <li>• Actualizar competencias del empleado conforme complete capacitaciones</li>
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
