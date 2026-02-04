import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

export default function JobProfileManagement() {
  const [selectedPositionId, setSelectedPositionId] = useState<number | null>(null);
  const [newCompetency, setNewCompetency] = useState({
    competencyName: "",
    competencyType: "tecnica" as "tecnica" | "transversal" | "conocimiento",
    requiredLevel: "basico" as "basico" | "intermedio" | "avanzado" | "experto",
    description: "",
  });

  const { data: positionsData } = trpc.employees.getPositions.useQuery();
  const { data: profiles, refetch } = trpc.jobProfiles.getByPosition.useQuery(
    { positionId: selectedPositionId! },
    { enabled: !!selectedPositionId }
  );

  const createMutation = trpc.jobProfiles.create.useMutation({
    onSuccess: () => {
      toast.success("Competencia agregada exitosamente");
      refetch();
      setNewCompetency({
        competencyName: "",
        competencyType: "tecnica",
        requiredLevel: "basico",
        description: "",
      });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.jobProfiles.delete.useMutation({
    onSuccess: () => {
      toast.success("Competencia eliminada");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleAddCompetency = () => {
    if (!selectedPositionId) {
      toast.error("Por favor selecciona un puesto");
      return;
    }

    if (!newCompetency.competencyName.trim()) {
      toast.error("Por favor ingresa el nombre de la competencia");
      return;
    }

    createMutation.mutate({
      positionId: selectedPositionId,
      ...newCompetency,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta competencia?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Perfiles de Puesto</h1>
        <p className="text-muted-foreground">
          Define las competencias requeridas para cada puesto
        </p>
      </div>

      {/* Selector de puesto */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Seleccionar Puesto</h2>
        <Select
          value={selectedPositionId?.toString() || ""}
          onValueChange={(value) => setSelectedPositionId(parseInt(value))}
        >
          <option value="">Seleccionar puesto...</option>
          {positionsData?.filter((pos): pos is string => pos !== null).map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </Select>
      </Card>

      {selectedPositionId && (
        <>
          {/* Formulario para agregar competencia */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Agregar Competencia</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Nombre de la Competencia
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={newCompetency.competencyName}
                  onChange={(e) =>
                    setNewCompetency({ ...newCompetency, competencyName: e.target.value })
                  }
                  placeholder="Ej: Manejo de Excel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tipo</label>
                <Select
                  value={newCompetency.competencyType}
                  onValueChange={(value: any) =>
                    setNewCompetency({ ...newCompetency, competencyType: value })
                  }
                >
                  <option value="tecnica">Técnica</option>
                  <option value="transversal">Transversal</option>
                  <option value="conocimiento">Conocimiento</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Nivel Requerido</label>
                <Select
                  value={newCompetency.requiredLevel}
                  onValueChange={(value: any) =>
                    setNewCompetency({ ...newCompetency, requiredLevel: value })
                  }
                >
                  <option value="basico">Básico</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="avanzado">Avanzado</option>
                  <option value="experto">Experto</option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Descripción</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md"
                  value={newCompetency.description}
                  onChange={(e) =>
                    setNewCompetency({ ...newCompetency, description: e.target.value })
                  }
                  placeholder="Descripción opcional"
                />
              </div>
            </div>

            <Button onClick={handleAddCompetency} disabled={createMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Competencia
            </Button>
          </Card>

          {/* Lista de competencias */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              Competencias Requeridas ({profiles?.length || 0})
            </h2>

            {profiles && profiles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">Competencia</th>
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Nivel Requerido</th>
                      <th className="text-left p-3">Descripción</th>
                      <th className="text-right p-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((profile) => (
                      <tr key={profile.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{profile.competencyName}</td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                            {profile.competencyType === "tecnica"
                              ? "Técnica"
                              : profile.competencyType === "transversal"
                              ? "Transversal"
                              : "Conocimiento"}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              profile.requiredLevel === "experto"
                                ? "bg-purple-100 text-purple-800"
                                : profile.requiredLevel === "avanzado"
                                ? "bg-green-100 text-green-800"
                                : profile.requiredLevel === "intermedio"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {profile.requiredLevel.charAt(0).toUpperCase() +
                              profile.requiredLevel.slice(1)}
                          </span>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {profile.description || "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(profile.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No hay competencias definidas para este puesto</p>
                <p className="text-sm mt-2">
                  Agrega competencias usando el formulario de arriba
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
