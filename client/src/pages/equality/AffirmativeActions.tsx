import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, Clock, XCircle, Target } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

type ActionFormData = {
  titulo: string;
  tipo: "capacitacion" | "promocion" | "contratacion" | "conciliacion" | "infraestructura" | "otro" | "";
  descripcion: string;
  objetivo: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
};

export default function AffirmativeActions() {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<ActionFormData>({
    titulo: "",
    tipo: "",
    descripcion: "",
    objetivo: "",
    responsable: "",
    fechaInicio: "",
    fechaFin: "",
  });

  const utils = trpc.useUtils();
  const { data: actions = [], isLoading } = trpc.equality.affirmativeActions.list.useQuery();

  const createMutation = trpc.equality.affirmativeActions.create.useMutation({
    onSuccess: () => {
      alert("Acción afirmativa creada exitosamente");
      utils.equality.affirmativeActions.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.equality.affirmativeActions.update.useMutation({
    onSuccess: () => {
      alert("Acción afirmativa actualizada exitosamente");
      utils.equality.affirmativeActions.list.invalidate();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.equality.affirmativeActions.delete.useMutation({
    onSuccess: () => {
      alert("Acción afirmativa eliminada exitosamente");
      utils.equality.affirmativeActions.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      titulo: "",
      tipo: "",
      descripcion: "",
      objetivo: "",
      responsable: "",
      fechaInicio: "",
      fechaFin: "",
    });
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipo) {
      alert("Por favor seleccione un tipo de acción");
      return;
    }
    const data = {
      titulo: formData.titulo,
      tipo: formData.tipo as "capacitacion" | "promocion" | "contratacion" | "conciliacion" | "infraestructura" | "otro",
      descripcion: formData.descripcion,
      objetivo: formData.objetivo,
      responsable: formData.responsable,
      fechaInicio: formData.fechaInicio,
      fechaFin: formData.fechaFin || undefined,
    };
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (action: any) => {
    setFormData({
      titulo: action.titulo,
      tipo: action.tipo,
      descripcion: action.descripcion,
      objetivo: action.objetivo,
      responsable: action.responsable,
      fechaInicio: action.fechaInicio.split("T")[0],
      fechaFin: action.fechaFin ? action.fechaFin.split("T")[0] : "",
    });
    setEditingId(action.id);
    setIsCreating(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Eliminar esta acción afirmativa?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      planificada: { variant: "secondary", icon: Clock },
      "en_progreso": { variant: "default", icon: Target },
      completada: { variant: "default", icon: CheckCircle },
      cancelada: { variant: "outline", icon: XCircle },
    };
    const config = variants[estado] || variants.planificada;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {estado.replace("_", " ").charAt(0).toUpperCase() + estado.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  // Calcular estadísticas
  const totalActions = actions.length;
  const inProgress = actions.filter(a => a.estado === "en_progreso").length;
  const completed = actions.filter(a => a.estado === "completada").length;
  const planned = actions.filter(a => a.estado === "planeada").length;

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Igualdad Laboral y No Discriminación", path: "/equality/policy" },
        { label: "Acciones Afirmativas" }
      ]} />
      
      <div className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-3xl font-bold">Acciones Afirmativas</h1>
          <p className="text-muted-foreground">NMX-025-SCFI-2015 - Requisito 4.3.1</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Cancelar" : "Nueva Acción"}
        </Button>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Acciones</CardDescription>
            <CardTitle className="text-3xl">{totalActions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Planificadas</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{planned}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Progreso</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Completadas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{completed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Formulario */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Acción Afirmativa" : "Nueva Acción Afirmativa"}</CardTitle>
            <CardDescription>
              Registra acciones para promover la igualdad laboral y no discriminación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título de la Acción *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Programa de Capacitación en Igualdad de Género"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Acción *</Label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Seleccione un tipo...</option>
                    <option value="capacitacion">Capacitación</option>
                    <option value="promocion">Promoción</option>
                    <option value="contratacion">Contratación</option>
                    <option value="conciliacion">Conciliación</option>
                    <option value="infraestructura">Infraestructura</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="responsable">Responsable *</Label>
                  <Input
                    id="responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    placeholder="Nombre del responsable"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe la acción afirmativa..."
                  rows={3}
                  required
                />
              </div>

              <div>
                <Label htmlFor="objetivo">Objetivo *</Label>
                <Textarea
                  id="objetivo"
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Describe el objetivo de la acción..."
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="fechaFin">Fecha de Fin (opcional)</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingId ? "Actualizar" : "Crear Acción"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Acciones */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Afirmativas Registradas</CardTitle>
          <CardDescription>Todas las acciones para promover la igualdad</CardDescription>
        </CardHeader>
        <CardContent>
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay acciones registradas
            </p>
          ) : (
            <div className="space-y-3">
              {actions.map((action: any) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-medium">{action.tipo}</h3>
                      {getStatusBadge(action.estado)}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{action.descripcion}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>Responsable: {action.responsable}</span>
                      <span>Inicio: {new Date(action.fechaInicio).toLocaleDateString()}</span>
                      {action.fechaFin && (
                        <span>Fin: {new Date(action.fechaFin).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(action)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(action.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
