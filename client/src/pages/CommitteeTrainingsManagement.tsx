import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Users, Clock, Award, BookOpen } from "lucide-react";

const TRAINING_TYPES = [
  { value: "mobbing", label: "Mobbing / Acoso Laboral" },
  { value: "burnout", label: "Burnout / Agotamiento" },
  { value: "primeros_auxilios_psicologicos", label: "Primeros Auxilios Psicológicos" },
  { value: "nom035", label: "NOM-035 STPS 2018" },
  { value: "investigacion", label: "Investigación de Casos" },
  { value: "otro", label: "Otro" },
];

export default function CommitteeTrainingsManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<any>(null);
  const [filterType, setFilterType] = useState<string | undefined>(undefined);

  const { data: trainings, isLoading, refetch } = trpc.committeeTrainings.list.useQuery({
    type: filterType as any,
  });

  const { data: stats } = trpc.committeeTrainings.getStats.useQuery();

  const createMutation = trpc.committeeTrainings.create.useMutation({
    onSuccess: () => {
      toast.success("Capacitación creada exitosamente");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = trpc.committeeTrainings.update.useMutation({
    onSuccess: () => {
      toast.success("Capacitación actualizada exitosamente");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.committeeTrainings.delete.useMutation({
    onSuccess: () => {
      toast.success("Capacitación eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const assignToRoleMutation = trpc.trainingAssignments.assignToRole.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsAssignDialogOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as any,
      duration: parseInt(formData.get("duration") as string),
      validityMonths: formData.get("validityMonths") ? parseInt(formData.get("validityMonths") as string) : undefined,
      isRequired: formData.get("isRequired") === "true",
      content: formData.get("content") as string,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateMutation.mutate({
      id: selectedTraining.id,
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      type: formData.get("type") as any,
      duration: parseInt(formData.get("duration") as string),
      validityMonths: formData.get("validityMonths") ? parseInt(formData.get("validityMonths") as string) : undefined,
      isRequired: formData.get("isRequired") === "true",
      content: formData.get("content") as string,
    });
  };

  const handleAssignToRole = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    assignToRoleMutation.mutate({
      trainingId: selectedTraining.id,
      targetRole: formData.get("targetRole") as string,
      notes: formData.get("notes") as string,
    });
  };

  const handleDelete = (id: number, title: string) => {
    if (confirm(`¿Estás seguro de eliminar la capacitación "${title}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const getTypeLabel = (type: string) => {
    return TRAINING_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Capacitaciones del Comité</h1>
          <p className="text-muted-foreground mt-1">
            Administra el catálogo de capacitaciones obligatorias para miembros del comité
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Capacitación
        </Button>
      </div>

      {/* Cards de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacitaciones</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Obligatorias</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.required || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobbing</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byType?.mobbing || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NOM-035</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byType?.nom035 || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Tipo de Capacitación</Label>
              <Select
                value={filterType || "all"}
                onValueChange={(value) => setFilterType(value === "all" ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TRAINING_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Capacitaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Catálogo de Capacitaciones</CardTitle>
          <CardDescription>
            {trainings?.length || 0} capacitaciones registradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : trainings && trainings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Obligatoria</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trainings.map((training) => (
                  <TableRow key={training.id}>
                    <TableCell className="font-medium">{training.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(training.type)}</Badge>
                    </TableCell>
                    <TableCell>{training.duration} hrs</TableCell>
                    <TableCell>
                      {training.validityMonths ? `${training.validityMonths} meses` : "Sin vencimiento"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={training.isRequired ? "default" : "secondary"}>
                        {training.isRequired ? "Sí" : "No"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTraining(training);
                            setIsAssignDialogOpen(true);
                          }}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedTraining(training);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(training.id, training.title)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay capacitaciones registradas
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Crear */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Capacitación</DialogTitle>
            <DialogDescription>
              Crea una nueva capacitación para el comité
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" required />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRAINING_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duración (horas) *</Label>
                <Input id="duration" name="duration" type="number" min="1" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="validityMonths">Vigencia (meses)</Label>
                <Input id="validityMonths" name="validityMonths" type="number" min="1" />
              </div>
              <div>
                <Label htmlFor="isRequired">¿Es obligatoria? *</Label>
                <Select name="isRequired" defaultValue="true">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="content">Contenido / Temario</Label>
              <Textarea id="content" name="content" rows={4} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Capacitación</DialogTitle>
            <DialogDescription>
              Modifica los datos de la capacitación
            </DialogDescription>
          </DialogHeader>
          {selectedTraining && (
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Título *</Label>
                <Input id="edit-title" name="title" defaultValue={selectedTraining.title} required />
              </div>
              <div>
                <Label htmlFor="edit-description">Descripción</Label>
                <Textarea id="edit-description" name="description" defaultValue={selectedTraining.description || ""} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-type">Tipo *</Label>
                  <Select name="type" defaultValue={selectedTraining.type}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRAINING_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-duration">Duración (horas) *</Label>
                  <Input id="edit-duration" name="duration" type="number" min="1" defaultValue={selectedTraining.duration} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-validityMonths">Vigencia (meses)</Label>
                  <Input id="edit-validityMonths" name="validityMonths" type="number" min="1" defaultValue={selectedTraining.validityMonths || ""} />
                </div>
                <div>
                  <Label htmlFor="edit-isRequired">¿Es obligatoria? *</Label>
                  <Select name="isRequired" defaultValue={selectedTraining.isRequired ? "true" : "false"}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Sí</SelectItem>
                      <SelectItem value="false">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-content">Contenido / Temario</Label>
                <Textarea id="edit-content" name="content" defaultValue={selectedTraining.content || ""} rows={4} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Asignar a Rol */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar a Rol</DialogTitle>
            <DialogDescription>
              Asigna esta capacitación a todos los miembros con un rol específico
            </DialogDescription>
          </DialogHeader>
          {selectedTraining && (
            <form onSubmit={handleAssignToRole} className="space-y-4">
              <div>
                <Label>Capacitación</Label>
                <Input value={selectedTraining.title} disabled />
              </div>
              <div>
                <Label htmlFor="targetRole">Rol Objetivo *</Label>
                <Select name="targetRole" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="committee_member">Miembro del Comité</SelectItem>
                    <SelectItem value="committee_coordinator">Coordinador del Comité</SelectItem>
                    <SelectItem value="committee">Comité (General)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={assignToRoleMutation.isPending}>
                  {assignToRoleMutation.isPending ? "Asignando..." : "Asignar"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
