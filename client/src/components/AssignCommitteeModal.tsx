import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Briefcase, AlertCircle } from "lucide-react";

interface AssignCommitteeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
  caseNumber: string;
  onSuccess?: () => void;
}

export function AssignCommitteeModal({
  open,
  onOpenChange,
  caseId,
  caseNumber,
  onSuccess,
}: AssignCommitteeModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  // Obtener miembros del comité
  const { data: committeeMembers, isLoading: loadingMembers } =
    trpc.cases.getCommitteeMembers.useQuery() as any;

  // Obtener distribución de carga de trabajo
  const { data: workload, isLoading: loadingWorkload } =
    trpc.cases.getCommitteeWorkload.useQuery() as any;

  // Mutación para asignar caso
  const assignCase = (trpc.cases.assignCaseToCommittee as any).useMutation({
    onSuccess: () => {
      toast.success("Caso asignado exitosamente");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Error al asignar caso: ${error.message}`);
    },
  });

  const handleAssign = () => {
    if (!selectedMemberId) {
      toast.error("Por favor selecciona un miembro del comité");
      return;
    }

    assignCase.mutate({
      caseId,
      userId: parseInt(selectedMemberId),
      role: "investigador_principal",
    });
  };

  // Obtener carga de trabajo de un miembro específico
  const getMemberWorkload = (userId: number) => {
    return workload?.find((w: any) => w.userId === userId)?.activeCases || 0;
  };

  // Calcular nivel de carga (bajo, medio, alto)
  const getWorkloadLevel = (activeCases: number): "low" | "medium" | "high" => {
    if (activeCases === 0) return "low";
    if (activeCases <= 2) return "medium";
    return "high";
  };

  // Colores según nivel de carga
  const workloadColors = {
    low: "text-green-600 bg-green-50",
    medium: "text-yellow-600 bg-yellow-50",
    high: "text-red-600 bg-red-50",
  };

  // Textos según nivel de carga
  const workloadLabels = {
    low: "Disponible",
    medium: "Carga moderada",
    high: "Alta carga",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar Caso a Miembro del Comité</DialogTitle>
          <DialogDescription>
            Selecciona un miembro del comité para asignar el caso{" "}
            <strong>{caseNumber}</strong>. La distribución de carga de trabajo
            te ayudará a equilibrar la asignación.
          </DialogDescription>
        </DialogHeader>

        {loadingMembers || loadingWorkload ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {committeeMembers && committeeMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mb-3" />
                <p className="text-gray-600">
                  No hay miembros del comité disponibles
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Agrega miembros del comité en la sección de Comité
                </p>
              </div>
            ) : (
              <RadioGroup
                value={selectedMemberId}
                onValueChange={setSelectedMemberId}
              >
                <div className="space-y-3">
                  {committeeMembers?.map((member: any) => {
                    const activeCases = getMemberWorkload(member.id);
                    const workloadLevel = getWorkloadLevel(activeCases);

                    return (
                      <Card
                        key={member.id}
                        className={`cursor-pointer transition-all ${
                          selectedMemberId === member.id.toString()
                            ? "ring-2 ring-blue-500 bg-blue-50"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={() =>
                          setSelectedMemberId(member.id.toString())
                        }
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start space-x-4">
                            <RadioGroupItem
                              value={member.id.toString()}
                              id={`member-${member.id}`}
                              className="mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <Label
                                  htmlFor={`member-${member.id}`}
                                  className="flex items-center gap-2 cursor-pointer font-medium"
                                >
                                  <User className="h-4 w-4 text-gray-500" />
                                  {member.name}
                                </Label>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-medium ${workloadColors[workloadLevel]}`}
                                >
                                  {workloadLabels[workloadLevel]}
                                </span>
                              </div>

                              {member.email && (
                                <p className="text-sm text-gray-500 mt-1">
                                  {member.email}
                                </p>
                              )}

                              <div className="flex items-center gap-4 mt-3">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">
                                    <strong>{activeCases}</strong> caso
                                    {activeCases !== 1 ? "s" : ""} activo
                                    {activeCases !== 1 ? "s" : ""}
                                  </span>
                                </div>

                                {/* Barra de progreso visual */}
                                <div className="flex-1 max-w-xs">
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${
                                        workloadLevel === "low"
                                          ? "bg-green-500"
                                          : workloadLevel === "medium"
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                      }`}
                                      style={{
                                        width: `${Math.min((activeCases / 5) * 100, 100)}%`,
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </RadioGroup>
            )}

            {/* Resumen de distribución */}
            {workload && workload.length > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Distribución de Carga de Trabajo
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-blue-700 font-medium">
                        Total de casos activos
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {workload.reduce(
                          (sum: number, w: any) => sum + w.activeCases,
                          0
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">
                        Promedio por miembro
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {(
                          workload.reduce(
                            (sum: number, w: any) => sum + w.activeCases,
                            0
                          ) / workload.length
                        ).toFixed(1)}
                      </p>
                    </div>
                    <div>
                      <p className="text-blue-700 font-medium">
                        Miembros disponibles
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {
                          workload.filter((w: any) => w.activeCases === 0)
                            .length
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedMemberId || assignCase.isPending}
          >
            {assignCase.isPending ? "Asignando..." : "Asignar Caso"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
