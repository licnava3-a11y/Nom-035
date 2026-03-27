import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, UserMinus, Users, CheckCircle, XCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Committee() {
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<{
    userId: string;
    cargo: "presidente" | "secretario" | "vocal" | "asesor" | "";
    fechaDesignacion: string;
  }>({
    userId: "",
    cargo: "",
    fechaDesignacion: "",
  });

  const utils = trpc.useUtils();
  const { data: members = [], isLoading } = trpc.equality.committee.list.useQuery();
  const { data: usersData } = trpc.employees.list.useQuery({});
  const users = usersData?.employees ?? [];

  const addMemberMutation = trpc.equality.committee.addMember.useMutation({
    onSuccess: () => {
      alert("Miembro agregado exitosamente");
      utils.equality.committee.list.invalidate();
      setIsAdding(false);
      setFormData({ userId: "", cargo: "", fechaDesignacion: "" });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const removeMemberMutation = trpc.equality.committee.removeMember.useMutation({
    onSuccess: () => {
      alert("Miembro removido exitosamente");
      utils.equality.committee.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cargo) {
      alert("Por favor seleccione un cargo");
      return;
    }
    addMemberMutation.mutate({
      userId: parseInt(formData.userId),
      cargo: formData.cargo as "presidente" | "secretario" | "vocal" | "asesor",
      fechaDesignacion: formData.fechaDesignacion,
    });
  };

  const handleRemove = (id: number) => {
    if (confirm("¿Remover este miembro del comité?")) {
      removeMemberMutation.mutate({ id });
    }
  };

  // Calcular estadísticas
  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.activo).length;
  const inactiveMembers = members.filter(m => !m.activo).length;

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Igualdad Laboral y No Discriminación", path: "/equality/policy" },
        { label: "Comité de Igualdad" }
      ]} />
      
      <div className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-3xl font-bold">Comité de Igualdad</h1>
          <p className="text-muted-foreground">NMX-025-SCFI-2015 - Requisito 4.4.1</p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)}>
          <Plus className="h-4 w-4 mr-2" />
          {isAdding ? "Cancelar" : "Agregar Miembro"}
        </Button>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Miembros</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Users className="h-8 w-8" />
              {totalMembers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Miembros Activos</CardDescription>
            <CardTitle className="text-3xl text-green-600">{activeMembers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Miembros Inactivos</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{inactiveMembers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Formulario de Agregar Miembro */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar Miembro al Comité</CardTitle>
            <CardDescription>
              Designa un nuevo miembro para el Comité de Igualdad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="userId">Seleccionar Usuario *</Label>
                <select
                  id="userId"
                  value={formData.userId}
                  onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="">Seleccionar usuario...</option>
                  {users.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} - Puesto ID: {user.positionId || "N/A"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="cargo">Cargo en el Comité *</Label>
                <select
                  id="cargo"
                  value={formData.cargo}
                  onChange={(e) => setFormData({ ...formData, cargo: e.target.value as any })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  required
                >
                  <option value="">Seleccione un cargo...</option>
                  <option value="presidente">Presidente</option>
                  <option value="secretario">Secretario</option>
                  <option value="vocal">Vocal</option>
                  <option value="asesor">Asesor</option>
                </select>
              </div>

              <div>
                <Label htmlFor="fechaDesignacion">Fecha de Designación *</Label>
                <Input
                  id="fechaDesignacion"
                  type="date"
                  value={formData.fechaDesignacion}
                  onChange={(e) => setFormData({ ...formData, fechaDesignacion: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={addMemberMutation.isPending}>
                  {addMemberMutation.isPending ? "Agregando..." : "Agregar al Comité"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Miembros del Comité */}
      <Card>
        <CardHeader>
          <CardTitle>Miembros del Comité</CardTitle>
          <CardDescription>Integrantes del Comité de Igualdad Laboral</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay miembros registrados en el comité
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{member.cargo}</h3>
                      <Badge variant={member.activo ? "default" : "outline"} className="gap-1">
                        {member.activo ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Activo
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Inactivo
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Usuario ID: {member.userId}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Designado: {new Date(member.fechaDesignacion).toLocaleDateString()}
                      {member.fechaTermino && (
                        <> • Término: {new Date(member.fechaTermino).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  {member.activo && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <UserMinus className="h-4 w-4 mr-2" />
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información del Comité */}
      <Card>
        <CardHeader>
          <CardTitle>Acerca del Comité de Igualdad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            El Comité de Igualdad Laboral y No Discriminación es el órgano responsable de:
          </p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Vigilar el cumplimiento de la política de igualdad laboral</li>
            <li>Revisar y aprobar acciones afirmativas</li>
            <li>Dar seguimiento a quejas y denuncias</li>
            <li>Proponer mejoras al sistema de igualdad</li>
            <li>Elaborar informes periódicos sobre el estado de la igualdad</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
