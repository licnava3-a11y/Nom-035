import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function CommitteeMemberNew() {
  const [, setLocation] = useLocation();
  
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [position, setPosition] = useState("");
  const [responsibilities, setResponsibilities] = useState("");

  // Get all users to select from
  const { data: users, isLoading: usersLoading } = trpc.users.list.useQuery();

  const addMutation = trpc.committee.add.useMutation({
    onSuccess: () => {
      toast.success("Miembro agregado", {
        description: "El miembro se ha agregado correctamente al comité.",
      });
      setLocation("/committee");
    },
    onError: (error: any) => {
      toast.error("Error", {
        description: error.message || "No se pudo agregar el miembro.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedUserId) {
      toast.error("Error", {
        description: "Debes seleccionar un usuario.",
      });
      return;
    }

    if (!position.trim()) {
      toast.error("Error", {
        description: "La posición es requerida.",
      });
      return;
    }

    addMutation.mutate({
      userId: parseInt(selectedUserId),
      position: position.trim(),
      responsibilities: responsibilities.trim() || undefined,
    });
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
          <h1 className="text-3xl font-bold">Agregar Miembro</h1>
          <p className="text-muted-foreground">Agrega un nuevo miembro al comité</p>
        </div>
      </div>

      {/* Add Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Nuevo Miembro</CardTitle>
          <CardDescription>
            Selecciona un usuario existente y asigna su posición en el comité
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading ? (
            <div className="text-center py-8">Cargando usuarios...</div>
          ) : !users || users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay usuarios disponibles</h3>
              <p className="text-muted-foreground">Primero debes crear usuarios en el sistema.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="user">Usuario *</Label>
                <select
                  id="user"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Selecciona un usuario</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id.toString()}>
                      {user.name || user.email || `Usuario ${user.id}`}
                      {user.email && ` (${user.email})`}
                    </option>
                  ))}
                </select>
                <p className="text-sm text-muted-foreground">
                  Selecciona el usuario que será miembro del comité
                </p>
              </div>

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

              <div className="flex gap-3">
                <Button type="submit" disabled={addMutation.isPending}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
