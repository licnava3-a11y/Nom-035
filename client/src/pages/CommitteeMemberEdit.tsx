import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function CommitteeMemberEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  
  const { data: member, isLoading } = trpc.committee.getById.useQuery(
    { id: parseInt(id!) },
    { enabled: !!id }
  );

  const [position, setPosition] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Update form when data loads
  useState(() => {
    if (member) {
      setPosition(member.position || "");
      setResponsibilities(member.responsibilities || "");
      setIsActive(member.isActive);
    }
  });

  const updateMutation = trpc.committee.update.useMutation({
    onSuccess: () => {
      toast.success("Miembro actualizado", {
        description: "Los cambios se han guardado correctamente.",
      });
      setLocation(`/committee/${id}`);
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message || "No se pudo actualizar el miembro.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!position.trim()) {
      toast.error("Error", {
        description: "La posición es requerida.",
      });
      return;
    }

    updateMutation.mutate({
      id: parseInt(id!),
      position: position.trim(),
      responsibilities: responsibilities.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/committee/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
        <div className="text-center py-12">Cargando...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setLocation("/committee")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold mb-2">Miembro no encontrado</h3>
            <p className="text-muted-foreground">El miembro del comité que buscas no existe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => setLocation(`/committee/${id}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Editar Miembro</h1>
          <p className="text-muted-foreground">Actualiza la información del miembro del comité</p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Miembro</CardTitle>
          <CardDescription>
            Editando: {member.userName || "Sin nombre"} ({member.userEmail || "Sin email"})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="position">Posición *</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ej: Coordinador, Secretario, Vocal"
                required
              />
              <p className="text-sm text-muted-foreground">
                Cargo o rol del miembro dentro del comité
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsabilidades</Label>
              <Textarea
                id="responsibilities"
                value={responsibilities}
                onChange={(e) => setResponsibilities(e.target.value)}
                placeholder="Describe las responsabilidades del miembro..."
                rows={5}
              />
              <p className="text-sm text-muted-foreground">
                Funciones y tareas asignadas al miembro
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Miembro activo
              </Label>
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation(`/committee/${id}`)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
