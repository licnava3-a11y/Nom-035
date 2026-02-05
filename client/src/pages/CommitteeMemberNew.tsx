import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import EmployeeSearchDialog from "@/components/EmployeeSearchDialog";

import { ArrowLeft, Save, Search, User, X } from "lucide-react";
import { toast } from "sonner";

export default function CommitteeMemberNew() {
  const [, setLocation] = useLocation();
  
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>("");
  const [position, setPosition] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  const addMutation = trpc.committee.add.useMutation({
    onSuccess: () => {
      toast.success("Miembro agregado exitosamente al comité");
      setLocation("/committee");
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al agregar miembro al comité");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedEmployeeId) {
      toast.error("Debes seleccionar un trabajador");
      return;
    }

    if (!position.trim()) {
      toast.error("La posición es requerida");
      return;
    }

    addMutation.mutate({
      userId: selectedEmployeeId,
      position: position.trim(),
      responsibilities: responsibilities.trim() || undefined,
    });
  };

  const handleEmployeeSelect = (employeeId: number, employeeName: string) => {
    setSelectedEmployeeId(employeeId);
    setSelectedEmployeeName(employeeName);
  };

  const handleClearSelection = () => {
    setSelectedEmployeeId(null);
    setSelectedEmployeeName("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setLocation("/committee")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Agregar Miembro al Comité</h1>
          <p className="text-muted-foreground">Selecciona un trabajador y asigna su rol en el comité</p>
        </div>
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Nuevo Miembro</CardTitle>
          <CardDescription>
            Busca un trabajador existente y asigna su posición en el comité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Employee Selection */}
            <div className="space-y-2">
              <Label>Trabajador *</Label>
              {selectedEmployeeId ? (
                <div className="flex items-center gap-2 p-3 border rounded-md bg-accent/50">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">{selectedEmployeeName}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setSearchDialogOpen(true)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar trabajador...
                </Button>
              )}
              <p className="text-sm text-muted-foreground">
                Busca por nombre, apellido o número de empleado
              </p>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Posición en el Comité *</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ej: Coordinador, Secretario, Vocal, Representante de Trabajadores"
                required
              />
              <p className="text-sm text-muted-foreground">
                Cargo o rol del miembro dentro del comité
              </p>
            </div>

            {/* Responsibilities */}
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsabilidades</Label>
              <Textarea
                id="responsibilities"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Describe las responsabilidades específicas del miembro en el comité..."
                rows={5}
              />
              <p className="text-sm text-muted-foreground">
                Funciones y tareas asignadas según la NOM-035
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" disabled={addMutation.isPending || !selectedEmployeeId}>
                <Save className="h-4 w-4 mr-2" />
                {addMutation.isPending ? "Guardando..." : "Agregar Miembro"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/committee")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Employee Search Dialog */}
      <EmployeeSearchDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelect={handleEmployeeSelect}
      />
    </div>
  );
}
