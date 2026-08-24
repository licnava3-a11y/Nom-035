import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useState, useMemo } from "react";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function CompetenciesDashboard() {
  const [selectedView, setSelectedView] = useState<
    "department" | "type" | "gaps"
  >("department");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Preparar parámetros de filtro temporal
  const dateFilter = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    };
  }, [dateRange]);

  const { data: overallStats } =
    trpc.competenciesStats.getOverallStats.useQuery(dateFilter);
  const { data: departmentStats } =
    trpc.competenciesStats.getByDepartment.useQuery(dateFilter);
  const { data: typeStats } =
    trpc.competenciesStats.getByType.useQuery(dateFilter);
  const { data: topGaps } = trpc.competenciesStats.getTopGaps.useQuery({
    limit: 10,
    ...dateFilter,
  });

  const getLevelLabel = (level: number) => {
    if (level >= 3.5) return "Experto";
    if (level >= 2.5) return "Avanzado";
    if (level >= 1.5) return "Intermedio";
    if (level >= 0.5) return "Básico";
    return "Sin evaluar";
  };

  const getLevelColor = (level: number) => {
    if (level >= 3.5) return "text-purple-600";
    if (level >= 2.5) return "text-green-600";
    if (level >= 1.5) return "text-yellow-600";
    if (level >= 0.5) return "text-orange-600";
    return "text-gray-600";
  };

  const getBarWidth = (value: number, max: number) => {
    return `${(value / max) * 100}%`;
  };

  return (
    <div className="container py-8">
      <Breadcrumb
        items={[
          {
            label: "Gestión de Talento",
            href: "/",
          },
          {
            label: "Competencias",
          },
        ]}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">
              Dashboard de Competencias Organizacionales
            </h1>
            <p className="text-muted-foreground">
              Análisis del nivel de competencias por departamento y áreas
              críticas
            </p>
          </div>
        </div>

        {/* Filtros Temporales */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Período:</span>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Overall Stats */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Empleados Activos
                </p>
                <p className="text-3xl font-bold">
                  {overallStats.totalEmployees}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Competencias Evaluadas
                </p>
                <p className="text-3xl font-bold">
                  {overallStats.totalCompetencies}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Perfiles de Puesto
                </p>
                <p className="text-3xl font-bold">
                  {overallStats.totalProfiles}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nivel Promedio</p>
                <p
                  className={`text-3xl font-bold ${getLevelColor(overallStats.avgCompetencyLevel)}`}
                >
                  {overallStats.avgCompetencyLevel.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getLevelLabel(overallStats.avgCompetencyLevel)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
        </div>
      )}

      {/* View Selector */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={selectedView === "department" ? "default" : "outline"}
          onClick={() => setSelectedView("department")}
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Por Departamento
        </Button>
        <Button
          variant={selectedView === "type" ? "default" : "outline"}
          onClick={() => setSelectedView("type")}
        >
          <PieChart className="mr-2 h-4 w-4" />
          Por Tipo
        </Button>
        <Button
          variant={selectedView === "gaps" ? "default" : "outline"}
          onClick={() => setSelectedView("gaps")}
        >
          <AlertTriangle className="mr-2 h-4 w-4" />
          Brechas Críticas
        </Button>
      </div>

      {/* Department View */}
      {selectedView === "department" && departmentStats && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Competencias por Departamento
          </h2>
          <div className="space-y-4">
            {departmentStats.map((dept, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{dept.department}</h3>
                    <p className="text-sm text-muted-foreground">
                      {dept.employeeCount} empleado
                      {dept.employeeCount !== 1 ? "s" : ""} •{" "}
                      {dept.competenciesCount} competencias evaluadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${getLevelColor(dept.avgCompetencyLevel)}`}
                    >
                      {dept.avgCompetencyLevel.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getLevelLabel(dept.avgCompetencyLevel)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                      style={{
                        width: `${(dept.avgCompetencyLevel / 4) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Critical Gaps Alert */}
                {dept.criticalGaps > 0 && (
                  <div className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded p-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-800">
                      <strong>{dept.criticalGaps}</strong> brecha
                      {dept.criticalGaps !== 1 ? "s" : ""} crítica
                      {dept.criticalGaps !== 1 ? "s" : ""} detectada
                      {dept.criticalGaps !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            ))}

            {departmentStats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No hay datos de departamentos disponibles</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Type View */}
      {selectedView === "type" && typeStats && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Competencias por Tipo</h2>
          <div className="space-y-6">
            {typeStats.map((type, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{type.type}</h3>
                    <p className="text-sm text-muted-foreground">
                      {type.count} competencias evaluadas
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${getLevelColor(type.avgLevel)}`}
                    >
                      {type.avgLevel.toFixed(1)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getLevelLabel(type.avgLevel)}
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      type.type === "Técnica"
                        ? "bg-blue-500"
                        : type.type === "Transversal"
                          ? "bg-green-500"
                          : "bg-purple-500"
                    }`}
                    style={{ width: `${(type.avgLevel / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}

            {typeStats.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <PieChart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>No hay datos de tipos de competencias disponibles</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Gaps View */}
      {selectedView === "gaps" && topGaps && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            Top 10 Brechas de Competencias Críticas
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Competencias con mayor brecha entre nivel requerido y nivel actual
            en la organización
          </p>

          <div className="space-y-3">
            {topGaps.map((gap, index) => {
              const maxGap = topGaps[0]?.totalGap || 1;

              return (
                <div
                  key={index}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl font-bold text-red-600">
                          #{index + 1}
                        </span>
                        <h3 className="font-semibold">{gap.competencyName}</h3>
                        <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                          {gap.competencyType === "tecnica"
                            ? "Técnica"
                            : gap.competencyType === "transversal"
                              ? "Transversal"
                              : "Conocimiento"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {gap.employeesAffected} empleado
                        {gap.employeesAffected !== 1 ? "s" : ""} afectado
                        {gap.employeesAffected !== 1 ? "s" : ""} •{" "}
                        {gap.criticalCount} caso
                        {gap.criticalCount !== 1 ? "s" : ""} crítico
                        {gap.criticalCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-600">
                        {gap.totalGap}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Brecha total
                      </p>
                    </div>
                  </div>

                  {/* Gap Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                      style={{ width: getBarWidth(gap.totalGap, maxGap) }}
                    ></div>
                  </div>
                </div>
              );
            })}

            {topGaps.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-green-700 mb-2">
                  ¡Excelente desempeño organizacional!
                </h3>
                <p className="text-muted-foreground">
                  No se detectaron brechas críticas de competencias en la
                  organización
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Action Recommendations */}
      {departmentStats &&
        departmentStats.some((d: any) => d.criticalGaps > 0) && (
          <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Target className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">
                  Recomendaciones de Acción
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Priorizar capacitación en departamentos con mayor número
                    de brechas críticas
                  </li>
                  <li>
                    • Desarrollar programas de capacitación específicos para las
                    competencias con mayores gaps
                  </li>
                  <li>
                    • Realizar evaluaciones trimestrales para medir el progreso
                    de cierre de brechas
                  </li>
                  <li>
                    • Considerar contratación externa o rotación interna para
                    cubrir competencias críticas faltantes
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}
    </div>
  );
}
