import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

type CompetencyLevel = "basico" | "intermedio" | "avanzado" | "experto";

const levelValue: Record<CompetencyLevel, number> = {
  basico: 1,
  intermedio: 2,
  avanzado: 3,
  experto: 4,
};

const levelLabels: Record<CompetencyLevel, string> = {
  basico: "Básico",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  experto: "Experto",
};

const levelColors: Record<CompetencyLevel, string> = {
  basico: "bg-yellow-100 text-yellow-800 border-yellow-300",
  intermedio: "bg-blue-100 text-blue-800 border-blue-300",
  avanzado: "bg-green-100 text-green-800 border-green-300",
  experto: "bg-purple-100 text-purple-800 border-purple-300",
};

const categoryLabels: Record<string, string> = {
  soft_skill: "Habilidad Blanda",
  organizational: "Organizacional",
  leadership: "Liderazgo",
  technical_transversal: "Técnica Transversal",
};

export default function EmployeeCompetencyEvaluation() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [competencyLevels, setCompetencyLevels] = useState<Record<number, CompetencyLevel>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Fetch employees
  const { data: employeesData, isLoading: loadingEmployees } = trpc.employees.list.useQuery();
  const employees = (employeesData as any) as Array<{ id: number; firstName: string; lastName: string; position: string; department: string }> | undefined;

  // Fetch organizational competencies
  const { data: orgCompetencies, isLoading: loadingCompetencies } =
    trpc.organizationalCompetencies.list.useQuery();

  // Fetch applicable competencies for selected employee
  const { data: applicableCompetencies, refetch: refetchApplicable } =
    trpc.organizationalCompetencies.getApplicableToEmployee.useQuery(
      { employeeId: selectedEmployeeId! },
      { enabled: !!selectedEmployeeId }
    );

  // Fetch employee's current competencies
  const { data: employeeCompetencies, refetch: refetchEmployeeComp } =
    trpc.jobProfiles.getEmployeeCompetencies.useQuery(
      { employeeId: selectedEmployeeId! },
      { enabled: !!selectedEmployeeId }
    );

  // Stabilize employee options
  const employeeOptions = useMemo(() => {
    if (!employees) return [];
    return employees.map((emp: any) => ({
      value: emp.id.toString(),
      label: `${emp.firstName} ${emp.lastName} - ${emp.position} (${emp.department})`,
    }));
  }, [employees]);

  // Stabilize level options
  const levelOptions = useMemo(
    () => [
      { value: "basico", label: "Básico" },
      { value: "intermedio", label: "Intermedio" },
      { value: "avanzado", label: "Avanzado" },
      { value: "experto", label: "Experto" },
    ],
    []
  );

  // Add competency mutation
  const addCompetencyMutation = trpc.jobProfiles.addEmployeeCompetency.useMutation({
    onSuccess: () => {
      refetchEmployeeComp();
      toast.success("Competencia guardada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error al guardar: ${error.message}`);
    },
  });

  // Load existing competency levels when employee changes
  useEffect(() => {
    if (employeeCompetencies && applicableCompetencies) {
      const levels: Record<number, CompetencyLevel> = {};
      applicableCompetencies.forEach((comp: any) => {
        const existing = employeeCompetencies.find(
          (ec) => ec.competencyName === comp.competencyName
        );
        if (existing) {
          levels[comp.id] = existing.currentLevel as CompetencyLevel;
        }
        // No establecer nivel por defecto si no existe
      });
      setCompetencyLevels(levels);
    }
  }, [employeeCompetencies, applicableCompetencies]);

  const handleLevelChange = (competencyId: number, level: CompetencyLevel) => {
    setCompetencyLevels((prev) => ({
      ...prev,
      [competencyId]: level,
    }));
  };

  const handleSave = async (competencyId: number, competencyName: string) => {
    if (!selectedEmployeeId) return;

    const level = competencyLevels[competencyId];
    if (!level) {
      toast.error("Por favor selecciona un nivel de competencia");
      return;
    }

    setIsSaving(true);
    try {
      await addCompetencyMutation.mutateAsync({
        employeeId: selectedEmployeeId,
        competencyName,
        competencyType: "transversal",
        currentLevel: level,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculateGap = (requiredLevel: CompetencyLevel, currentLevel: CompetencyLevel) => {
    return levelValue[requiredLevel] - levelValue[currentLevel];
  };

  const getGapIcon = (gap: number) => {
    if (gap > 0) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (gap < 0) return <TrendingDown className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getGapColor = (gap: number) => {
    if (gap >= 3) return "text-red-700 font-bold";
    if (gap === 2) return "text-orange-600 font-semibold";
    if (gap === 1) return "text-yellow-600";
    if (gap === 0) return "text-green-600";
    return "text-blue-600";
  };

  if (loadingEmployees || loadingCompetencies) {
    return (
      <div className="flex items-center justify-center h-64">
      <Breadcrumb items={[
        {
                label: "Gestión de Talento",
                href: "/"
        },
        {
                label: "Evaluación de Competencias"
        }
]} />

        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Evaluación de Competencias Organizacionales</h1>
          <p className="text-gray-600 mt-1">
            Evalúa las habilidades blandas y competencias transversales de los empleados
          </p>
        </div>
      </div>

      {/* Employee Selection */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Seleccionar Empleado</h2>
        <Select
          value={selectedEmployeeId?.toString() || ""}
          onValueChange={(value) => setSelectedEmployeeId(value ? Number(value) : null)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="-- Selecciona un empleado --" />
          </SelectTrigger>
          <SelectContent>
            {employeeOptions.map((option: any) => (
              <SelectItem key={`employee-${option.value}`} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Competencies Evaluation */}
      {selectedEmployeeId && applicableCompetencies && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Competencias Aplicables ({applicableCompetencies.length})
            </h2>
            <div className="text-sm text-gray-600">
              Evalúa cada competencia según el nivel actual del empleado
            </div>
          </div>

          {applicableCompetencies.length === 0 && (
            <Card className="p-6 text-center text-gray-600">
              No hay competencias organizacionales aplicables para este empleado
            </Card>
          )}

          {applicableCompetencies.map((comp: any) => {
            const currentLevel = competencyLevels[comp.id];
            const gap = currentLevel ? calculateGap(comp.requiredLevel as CompetencyLevel, currentLevel) : levelValue[comp.requiredLevel as CompetencyLevel];

            return (
              <Card key={comp.id} className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">{comp.competencyName}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {categoryLabels[comp.competencyCategory]}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mt-1">{comp.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getGapIcon(gap)}
                      <span className={`text-sm ${getGapColor(gap)}`}>
                        {gap > 0 ? `Brecha: ${gap}` : gap < 0 ? "Supera requerido" : "Cumple"}
                      </span>
                    </div>
                  </div>

                  {/* Levels */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nivel Requerido</label>
                      <div
                        className={`mt-1 px-3 py-2 rounded-lg border ${
                          levelColors[comp.requiredLevel as CompetencyLevel]
                        }`}
                      >
                        {levelLabels[comp.requiredLevel as CompetencyLevel]}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nivel Actual</label>
                      <Select
                        value={currentLevel || ""}
                        onValueChange={(value) =>
                          handleLevelChange(comp.id, value as CompetencyLevel)
                        }
                      >
                        <SelectTrigger className="mt-1 w-full">
                          <SelectValue placeholder="-- Seleccionar nivel --" />
                        </SelectTrigger>
                        <SelectContent>
                          {levelOptions.map((option: any) => (
                            <SelectItem key={`level-${comp.id}-${option.value}`} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSave(comp.id, comp.competencyName)}
                      disabled={isSaving || !currentLevel}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Guardar Evaluación
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
